import { ANSWER_TYPES, COMMENT_TYPES } from "./types";

export function blankToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

export function parseIntegerField(
  raw: string,
): { value: number | null; invalid: boolean } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, invalid: false };
  if (!/^-?\d+$/.test(trimmed)) return { value: null, invalid: true };
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(value)) return { value: null, invalid: true };
  return { value, invalid: false };
}

export function parseCategory(
  raw: string,
): { value: number | null; invalid: boolean } {
  const parsed = parseIntegerField(raw);
  if (parsed.invalid) return parsed;
  if (parsed.value === null) return parsed;
  if (parsed.value !== -1 && parsed.value !== 0 && parsed.value !== 1) {
    return { value: parsed.value, invalid: true };
  }
  return parsed;
}

export function isKnownCommentType(value: string): boolean {
  return (COMMENT_TYPES as readonly string[]).includes(value);
}

export function isKnownAnswerType(value: string): boolean {
  return (ANSWER_TYPES as readonly string[]).includes(value);
}
