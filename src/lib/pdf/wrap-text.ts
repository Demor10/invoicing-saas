import type { PDFFont } from "pdf-lib";

// pdf-lib draws text on a single line with no wrapping built in — this
// breaks a string into lines that each fit within maxWidth at the given
// font/size, splitting on whitespace. A single word longer than maxWidth is
// left as its own (overflowing) line rather than broken mid-word.
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ").filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${currentLine} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}
