/** Converts model-emitted LaTeX delimiters to MD4C syntax, preserving code and escaped slashes. */
export function normalizeChatMarkdown(markdown: string): string {
  // Protect fenced code (including an unfinished streaming fence) and inline code.
  return markdown.replace(
    /(^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\2[ \t]*(?=\n|$)|(?![\s\S]))|(`+)[\s\S]*?\3)|(?<!\\)((?:\\\\)*)(\\\[([\s\S]*?)\\\]|\\\(([^\n]*?)\\\))/gm,
    (match, code, _fence, _ticks, escapes, _math, block, inline) => {
      if (code) return match;
      if (block !== undefined) return `${escapes}\n\n$$\n${block.trim()}\n$$\n\n`;
      return `${escapes}$${inline}$`;
    }
  );
}
