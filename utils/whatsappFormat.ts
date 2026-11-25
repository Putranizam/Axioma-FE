/**
 * Formats Markdown AI responses into clean, WhatsApp-ready plain text.
 * - Preserves fenced code blocks as WhatsApp monospace (``` ... ```)
 * - Converts headings (## / ### Title) to *Title*
 * - Converts bold (**text** / __text__) to *text*
 * - Converts strikethrough (~~text~~) to ~text~
 * - Converts bullet lists (- / * item) to • item
 * - Cleans links, images, horizontal rules, and excess blank lines
 */
export function formatForWhatsApp(markdown: string): string {
  if (!markdown) return "";

  const codeBlocks: string[] = [];
  let text = markdown.replace(/\r\n/g, "\n");

  // 1. Protect fenced code blocks and strip language identifiers for WhatsApp monospace
  text = text.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_match, code: string) => {
    const cleanedCode = String(code || "").replace(/\n+$/, "");
    const token = `__WA_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`\`\`\`\n${cleanedCode}\n\`\`\``);
    return token;
  });

  // 2. Remove markdown images and simplify links [label](url) -> label (url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_m, alt: string) =>
    alt?.trim() ? alt.trim() : ""
  );
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)");

  // 3. Convert headings (# .. ###### Title) -> *Title*
  text = text.replace(/^[ \t]*#{1,6}[ \t]+(.+?)[ \t]*#*$/gm, (_m, heading: string) => {
    const cleanHeading = heading.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").trim();
    return cleanHeading ? `*${cleanHeading}*` : "";
  });

  // 4. Convert markdown horizontal rules (---, ***, ___) to clean spacing
  text = text.replace(/^[ \t]*([-*_]){3,}[ \t]*$/gm, "");

  // 5. Convert blockquotes (> text) cleanly
  text = text.replace(/^[ \t]*>[ \t]?/gm, "");

  // 6. Convert bullet lists (- item or * item) -> • item (before bold/italic replacement)
  text = text.replace(/^([ \t]*)[-*+][ \t]+/gm, (_m, indent: string) => {
    const prefix = indent.length >= 2 ? "  " : "";
    return `${prefix}• `;
  });

  // 7. Convert bold (**text** or __text__) -> *text*
  text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "*$1*");
  text = text.replace(/__(?=\S)([\s\S]*?\S)__/g, "*$1*");

  // 8. Convert strikethrough (~~text~~) -> ~text~
  text = text.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "~$1~");

  // 9. Clean markdown tables (remove separator rows like |---|---| and flatten pipes nicely)
  text = text.replace(/^[ \t]*\|?(?:[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*:?-{3,}:?[ \t]*\|?[ \t]*$/gm, "");
  text = text.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_m, row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(" · ")
  );

  // 10. Restore protected code blocks
  text = text.replace(/__WA_CODE_BLOCK_(\d+)__/g, (_m, idx: string) => {
    return codeBlocks[Number(idx)] ?? "";
  });

  // 11. Collapse excessive blank lines and trim
  return text.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
