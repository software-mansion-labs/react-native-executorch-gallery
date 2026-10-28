/** Isolates each build and closes LFM 2.6B's thinking prefix for direct structured output. */
export function widgetChatTemplate(template: string): string {
  const direct = template.replace(/<\|im_start\|>assistant(?:\\n|\n)<think>/g, '$&</think>');
  if (direct === template)
    throw new Error('Could not prepare the model for direct structured output.');
  return `{%- set widget_turn = namespace(index=0, messages=[]) -%}
{%- for message in messages -%}
  {%- if message.role == 'user' -%}{%- set widget_turn.index = loop.index0 -%}{%- endif -%}
{%- endfor -%}
{%- for message in messages -%}
  {%- if message.role == 'system' or loop.index0 >= widget_turn.index -%}
    {%- set widget_turn.messages = widget_turn.messages + [message] -%}
  {%- endif -%}
{%- endfor -%}
{%- set messages = widget_turn.messages -%}
${direct}`;
}

/** Versions the local session config so prompt edits replace a loaded session instead of retaining stale instructions. */
export function widgetConfigKey(content: string): string {
  let hash = 5381;
  for (let index = 0; index < content.length; index++)
    hash = (((hash << 5) + hash) ^ content.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
