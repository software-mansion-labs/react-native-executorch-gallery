import type { llm } from 'react-native-executorch';

/** Parses LFM3's XML-style calls using the declared tool argument types. */
export function parseLfmToolCalls(
  text: string,
  tools: llm.ToolDefinition[],
  enableThinking = true
): llm.ToolParserResult | undefined {
  const end = text.lastIndexOf('</think>');
  if (end < 0 && (enableThinking || text.includes('<think>'))) return;
  const answer = end < 0 ? text : text.slice(end + '</think>'.length);
  const pattern = /<tool_call>\s*<function=([^>\n]+)>([\s\S]*?)<\/function>\s*<\/tool_call>/g;
  const toolCalls: llm.ToolCall[] = [];
  try {
    for (const match of answer.matchAll(pattern)) {
      const name = match[1].trim();
      const tool = tools.find((candidate) => candidate.function.name === name);
      if (!tool) return;
      const parameters = tool.function.parameters;
      const args: Record<string, unknown> = {};
      for (const param of match[2].matchAll(
        /<parameter=([^>\n]+)>\n?([\s\S]*?)\n?<\/parameter>/g
      )) {
        const key = param[1].trim();
        const schema = parameters?.properties?.[key] as { type?: string } | undefined;
        if (!schema || Object.hasOwn(args, key)) return;
        args[key] = schema.type === 'string' ? param[2] : JSON.parse(param[2]);
      }
      if (parameters?.required?.some((key) => !Object.hasOwn(args, key))) return;
      toolCalls.push({ type: 'function', function: { name, arguments: args } });
    }
  } catch {
    return;
  }
  return toolCalls.length
    ? { toolCalls, textContent: answer.replace(pattern, '').trim() || undefined }
    : undefined;
}

/** Splits LFM's implicitly opened thinking block and hides incomplete control tokens. */
export function splitLfmResponse(raw: string, enableThinking = true) {
  const end = raw.indexOf('</think>');
  const clean = (text: string) =>
    text
      .replace(/<think>/g, '')
      .replace(/<tool_call>[\s\S]*$/g, '')
      .replace(/<\|[\s\S]*$/g, '')
      .replace(/<[^>]*$/g, '')
      .trim();
  return end < 0
    ? enableThinking
      ? { thinking: clean(raw), answer: '', reasoning: true }
      : { thinking: '', answer: clean(raw), reasoning: false }
    : {
        thinking: clean(raw.slice(0, end)),
        answer: clean(raw.slice(end + '</think>'.length)),
        reasoning: false,
      };
}

const number = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('Expected a finite number');
  return value;
};
const units: Record<string, { group: string; scale: number }> = {
  m: { group: 'length', scale: 1 },
  km: { group: 'length', scale: 1000 },
  cm: { group: 'length', scale: 0.01 },
  mi: { group: 'length', scale: 1609.344 },
  ft: { group: 'length', scale: 0.3048 },
  in: { group: 'length', scale: 0.0254 },
  kg: { group: 'mass', scale: 1 },
  g: { group: 'mass', scale: 0.001 },
  lb: { group: 'mass', scale: 0.45359237 },
  oz: { group: 'mass', scale: 0.028349523125 },
  l: { group: 'volume', scale: 1 },
  ml: { group: 'volume', scale: 0.001 },
};

/** Real, offline tools; validation failures are returned to the model for correction. */
export function createChatTools(
  onResult: (label: string, detail: string, args: Record<string, unknown>) => void
): llm.ToolDefinition[] {
  const tool = (
    name: string,
    description: string,
    properties: Record<string, unknown>,
    required: string[],
    run: (args: Record<string, unknown>) => unknown
  ): llm.ToolDefinition => ({
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties, required } },
    execute: (args) => {
      try {
        const result = JSON.stringify(run(args));
        onResult(name, result, args);
        return result;
      } catch (error) {
        const result = JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        });
        onResult(name, result, args);
        return result;
      }
    },
  });
  return [
    tool(
      'calculate',
      'Calculate with two numbers. Use for arithmetic, including percentages.',
      {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      ['operation', 'a', 'b'],
      ({ operation, a, b }) => {
        const x = number(a),
          y = number(b);
        const operations: Record<string, () => number> = {
          add: () => x + y,
          subtract: () => x - y,
          multiply: () => x * y,
          divide: () => {
            if (y === 0) throw new Error('Cannot divide by zero');
            return x / y;
          },
        };
        if (!Object.hasOwn(operations, String(operation))) throw new Error('Unknown operation');
        return { result: number(operations[String(operation)]()) };
      }
    ),
    tool(
      'convert_units',
      'Convert measurements. Units: m, km, cm, mi, ft, in, kg, g, lb, oz, l, ml, C, F.',
      { value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' } },
      ['value', 'from', 'to'],
      ({ value, from, to }) => {
        const x = number(value),
          source = String(from),
          target = String(to);
        let result: number;
        if (['C', 'F'].includes(source) && ['C', 'F'].includes(target))
          result = source === target ? x : source === 'C' ? (x * 9) / 5 + 32 : ((x - 32) * 5) / 9;
        else {
          const a = Object.hasOwn(units, source) ? units[source] : undefined;
          const b = Object.hasOwn(units, target) ? units[target] : undefined;
          if (!a || !b || a.group !== b.group)
            throw new Error('Use supported units of the same kind');
          result = (x * a.scale) / b.scale;
        }
        return { value: number(result), unit: target };
      }
    ),
    tool(
      'current_datetime',
      'Read the actual device date and time, optionally in an IANA timezone such as Asia/Tokyo.',
      { timezone: { type: 'string' } },
      [],
      ({ timezone }) => {
        const zone =
          timezone === undefined
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : String(timezone);
        return {
          dateTime: new Intl.DateTimeFormat('en-US', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: zone,
          }).format(new Date()),
          timezone: zone,
        };
      }
    ),
  ];
}

export const CHAT_MESSAGES: readonly llm.ChatMessage[] = [
  {
    role: 'system',
    content:
      'You are a helpful, concise on-device assistant. Use the calculator for arithmetic, the unit converter for measurements, and the clock for current dates and times. Never invent tool results. Answer naturally and briefly. Use short paragraphs and simple lists when helpful. Keep your reasoning brief.',
  },
];
export const CHAT_GENERATION = {
  temperature: 0.1,
  topP: 1,
  topK: 50,
  repetitionPenalty: 1.1,
  maxNewTokens: 2048,
};
