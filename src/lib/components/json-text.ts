/** What reading the text of a JSON field yielded: the parsed value, or why it could not be read. */
export type JsonTextResult = { valid: true; data: unknown } | { valid: false; error: string };

export interface JsonTextOptions {
  /** Rejects blank text. Off by default, so an optional field left blank reads as `undefined`. */
  required?: boolean;
  /** The error for blank text when `required`. */
  requiredMessage?: string;
}

/**
 * Parses the text of a JSON field. Blank text is valid and `undefined`, or invalid when
 * `required`; anything else goes through `JSON.parse`, whose message is carried through as the
 * error, since it names where the document broke.
 */
export const parseJsonText = (
  text: string,
  { required = false, requiredMessage = "Required" }: JsonTextOptions = {},
): JsonTextResult => {
  if (!text.trim())
    return required ? { valid: false, error: requiredMessage } : { valid: true, data: undefined };
  try {
    return { valid: true, data: JSON.parse(text) as unknown };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/** Pretty-prints the text of a JSON field, or hands it back untouched when it does not parse. */
export const formatJsonText = (text: string, indent = 2): string => {
  const result = parseJsonText(text);
  if (!result.valid || result.data === undefined) return text;
  return JSON.stringify(result.data, null, indent);
};
