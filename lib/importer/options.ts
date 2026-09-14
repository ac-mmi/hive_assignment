/**
 * Split Spectora comma-separated option lists.
 * Surrounding whitespace is trimmed; labels are not rewritten.
 */
export function splitCommaSeparated(raw: string): {
  labels: string[];
  malformed: boolean;
} {
  if (raw === "" || raw.trim() === "") {
    return { labels: [], malformed: false };
  }
  const parts = raw.split(",");
  const labels: string[] = [];
  let malformed = false;
  for (const part of parts) {
    const label = part.trim();
    if (label === "") {
      malformed = true;
      continue;
    }
    labels.push(label);
  }
  return { labels, malformed };
}
