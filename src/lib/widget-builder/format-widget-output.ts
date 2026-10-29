/** Indents complete or partial JSON without changing strings, values, or malformed trailing output. */
export function formatWidgetOutput(source: string): string {
  if (!/^[\s]*[\[{]/.test(source)) return source;
  const output: string[] = [];
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let previous = '';
  const newline = () => output.push('\n', '  '.repeat(depth));

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      output.push(character);
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      previous = character;
      continue;
    }
    if (/\s/.test(character)) {
      let next = index + 1;
      while (next < source.length && /\s/.test(source[next])) next++;
      // Preserve whitespace inside malformed atoms (e.g. `1 2`) so formatting
      // cannot turn a broken response into apparently valid JSON.
      if (previous && !'{}[],:'.includes(previous) && !'{}[],:'.includes(source[next] ?? ''))
        output.push(source.slice(index, next));
      index = next - 1;
      continue;
    }
    if (character === '"') {
      quoted = true;
      output.push(character);
    } else if (character === '{' || character === '[') {
      output.push(character);
      depth++;
      const following = source.slice(index + 1).trimStart()[0];
      if (following !== (character === '{' ? '}' : ']')) newline();
    } else if (character === '}' || character === ']') {
      depth = Math.max(0, depth - 1);
      if (previous !== (character === '}' ? '{' : '[')) newline();
      output.push(character);
      if (!depth) {
        output.push(source.slice(index + 1));
        break;
      }
    } else if (character === ',') {
      output.push(character);
      newline();
    } else if (character === ':') output.push(': ');
    else output.push(character);
    previous = character;
  }
  return output.join('');
}
