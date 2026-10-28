import { parse, tokenize } from '@huggingface/jinja';
import type { llm } from 'react-native-executorch';

type Literal = { type: string; value: unknown };

function literal(node: Literal): unknown {
  if (['StringLiteral', 'IntegerLiteral', 'FloatLiteral'].includes(node.type)) return node.value;
  if (node.type === 'ArrayLiteral') return (node.value as Literal[]).map(literal);
  if (node.type === 'ObjectLiteral')
    return Object.fromEntries(
      [...(node.value as Map<Literal, Literal>)].map(([key, value]) => {
        const name = literal(key);
        if (typeof name !== 'string') throw new Error('Expected string key');
        return [name, literal(value)];
      })
    );
  const constants: Record<string, unknown> = {
    True: true,
    False: false,
    None: null,
    true: true,
    false: false,
    null: null,
  };
  if (node.type === 'Identifier' && Object.hasOwn(constants, String(node.value)))
    return constants[String(node.value)];
  throw new Error('Expected literal argument');
}

/** Parses the example app's LFM Python-style calls without evaluating generated code. */
export function parseLfmToolCalls(text: string): llm.ToolParserResult | undefined {
  const end = text.lastIndexOf('</think>');
  if (end < 0) return;
  const answer = text.slice(end + '</think>'.length);
  const pattern = /<\|tool_call_start\|>([\s\S]*?)<\|tool_call_end\|>/g;
  const toolCalls: llm.ToolCall[] = [];
  try {
    for (const match of answer.matchAll(pattern)) {
      const program = parse(tokenize(`{{ ${match[1]} }}`));
      const list = program.body[0] as Literal;
      if (program.body.length !== 1 || list.type !== 'ArrayLiteral') return;
      for (const call of list.value as {
        type: string;
        callee: Literal;
        args: { type: string; key: Literal; value: Literal }[];
      }[]) {
        if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return;
        const args = Object.fromEntries(
          call.args.map((arg) => {
            if (arg.type !== 'KeywordArgumentExpression')
              throw new Error('Expected named argument');
            return [String(arg.key.value), literal(arg.value)];
          })
        );
        toolCalls.push({
          type: 'function',
          function: { name: String(call.callee.value), arguments: args },
        });
      }
    }
  } catch {
    return;
  }
  return toolCalls.length
    ? { toolCalls, textContent: answer.replace(pattern, '').trim() || undefined }
    : undefined;
}

/** Splits LFM's implicitly opened thinking block and hides incomplete control tokens. */
export function splitLfmResponse(raw: string) {
  const end = raw.indexOf('</think>');
  const clean = (text: string) =>
    text
      .replace(/<think>/g, '')
      .replace(/<\|[\s\S]*$/g, '')
      .replace(/<[^>]*$/g, '')
      .trim();
  return end < 0
    ? { thinking: clean(raw), answer: '', reasoning: true }
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
