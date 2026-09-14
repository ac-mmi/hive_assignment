import { describe, expect, it } from "vitest";
import { inspectCommentHtml, sanitizeCommentHtml } from "@/lib/importer/html";

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
});
