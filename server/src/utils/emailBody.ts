import { convert } from "html-to-text";

export function htmlToText(value: string): string {
  if (!value) return "";

  return convert(value, {
    wordwrap: 120,
    preserveNewlines: true,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "table", format: "block" },
      { selector: "tr", format: "block" },
      { selector: "td", format: "block" },
      { selector: "div", format: "block" },
      { selector: "p", format: "block" },
      { selector: "br", format: "lineBreak" },
    ],
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
