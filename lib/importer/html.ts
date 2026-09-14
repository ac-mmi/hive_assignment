import { Parser } from "htmlparser2";

const ALLOWED_TAGS = new Set([
  "p",
  "a",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "br",
  "ul",
  "ol",
  "li",
]);

const VOID_TAGS = new Set(["br"]);

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function isHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

/**
 * Decode HTML entities in Spectora names. Comment HTML is stored raw.
 */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
}

export type HtmlInspection = {
  unsupported: string[];
};

/**
 * Find HTML constructs in Comment Text that we will not render as-is.
 * The original string is still stored on the field.
 */
export function inspectCommentHtml(html: string): HtmlInspection {
  const unsupported: string[] = [];
  const parser = new Parser({
    onopentag(name, attribs) {
      const tag = name.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        unsupported.push(`<${tag}>`);
      }
      for (const [attr, raw] of Object.entries(attribs)) {
        const attribute = attr.toLowerCase();
        if (attribute.startsWith("on")) {
          unsupported.push(`${tag}[${attribute}]`);
          continue;
        }
        if (tag === "a" && attribute === "href") {
          if (!isHttpUrl(raw ?? "")) {
            unsupported.push("a[href] (non-http)");
          }
          continue;
        }
        if (tag === "a" && attribute === "target") continue;
        if (attribute === "class" || attribute === "style" || attribute === "id") {
          unsupported.push(`${tag}[${attribute}]`);
        } else if (tag !== "a") {
          unsupported.push(`${tag}[${attribute}]`);
        } else if (attribute !== "href" && attribute !== "target") {
          unsupported.push(`${tag}[${attribute}]`);
        }
      }
    },
  });
  parser.write(html);
  parser.end();
  return { unsupported: [...new Set(unsupported)] };
}

/**
 * Safe HTML for rendering. Does not replace the stored source string.
 */
export function sanitizeCommentHtml(html: string): string {
  let out = "";
  let skipDepth = 0;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();
        if (skipDepth > 0) {
          skipDepth += 1;
          return;
        }
        if (!ALLOWED_TAGS.has(tag)) {
          skipDepth = 1;
          return;
        }
        if (VOID_TAGS.has(tag)) {
          out += "<br />";
          return;
        }
        if (tag === "a") {
          const href = attribs.href ?? "";
          if (!isHttpUrl(href)) {
            skipDepth = 1;
            return;
          }
          const target =
            attribs.target === "_blank"
              ? ' target="_blank" rel="noopener noreferrer"'
              : "";
          out += `<a href="${escapeAttr(href.trim())}"${target}>`;
          return;
        }
        out += `<${tag}>`;
      },
      ontext(text) {
        if (skipDepth > 0) return;
        out += escapeText(text);
      },
      onclosetag(name) {
        const tag = name.toLowerCase();
        if (skipDepth > 0) {
          skipDepth -= 1;
          return;
        }
        if (!ALLOWED_TAGS.has(tag) || VOID_TAGS.has(tag)) return;
        out += `</${tag}>`;
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  return out;
}

/**
 * True when HTML would not show any comment text (empty editor, `<p></p>`, whitespace).
 */
export function isCommentHtmlEmpty(html: string): boolean {
  const sanitized = sanitizeCommentHtml(html);
  const text = sanitized
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}
