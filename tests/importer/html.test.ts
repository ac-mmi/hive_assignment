import { describe, expect, it } from "vitest";
import { inspectCommentHtml, isCommentHtmlEmpty, sanitizeCommentHtml } from "@/lib/importer/html";

describe("comment HTML safety", () => {
  it("keeps paragraph text and flags the real YouTube wrapper as unsupported", () => {
    const html =
      '<p>Wall had damage from doorknob.</p><div class="youtube-embed-wrapper" style="position:relative"> </div>';
    const inspection = inspectCommentHtml(html);
    expect(inspection.unsupported.some((entry) => entry.includes("div"))).toBe(true);
    const safe = sanitizeCommentHtml(html);
    expect(safe).toContain("Wall had damage from doorknob.");
    expect(safe).not.toContain("youtube-embed-wrapper");
    expect(safe).not.toContain("<div");
  });

  it("does not keep scripts or event handlers", () => {
    const safe = sanitizeCommentHtml(
      '<p onclick="alert(1)">ok</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    );
    expect(safe).not.toContain("script");
    expect(safe).not.toContain("onclick");
    expect(safe).not.toContain("javascript:");
    expect(safe).toContain("ok");
  });

  it("keeps strikethrough used by the comment editor", () => {
    const safe = sanitizeCommentHtml("<p>Keep <s>old</s> text</p>");
    expect(safe).toContain("<s>old</s>");
  });
});

describe("empty comment HTML", () => {
  it("treats empty editor markup as empty", () => {
    expect(isCommentHtmlEmpty("")).toBe(true);
    expect(isCommentHtmlEmpty("<p></p>")).toBe(true);
    expect(isCommentHtmlEmpty("<p><br></p>")).toBe(true);
    expect(isCommentHtmlEmpty("   ")).toBe(true);
  });

  it("does not treat real comment text as empty", () => {
    expect(isCommentHtmlEmpty("<p>Roof flashing showed signs of severe corrosion.</p>")).toBe(
      false,
    );
  });
});
