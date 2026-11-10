/**
 * The letters an avatar shows for a name: the first letter of the first word and of the last one,
 * upper-cased — "Ada Lovelace" is "AL", "ada" is "A". A blank name gives "?" rather than an empty
 * disc, which would read as a rendering bug.
 */
export const initials = (name: string): string => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};
