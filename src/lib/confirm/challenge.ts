/**
 * Whether a typed value satisfies a confirm challenge.
 *
 * Both sides are trimmed at the ends and then compared exactly: case, accents, inner spacing and
 * punctuation all have to match. The trim is there because the string being typed is almost always
 * a name read or copied off the row above it, and a copy picks up a trailing space far more often
 * than anyone means to type one. Folding case or accents on top of that would give away the one
 * thing the gate exists for — making the hand slow down over the exact name of the thing that is
 * about to be destroyed.
 */
export const matchesChallenge = (typed: string, challenge: string): boolean =>
  typed.trim() === challenge.trim();

/**
 * Whether the confirm action may be enabled for a request. A request with no challenge is always
 * satisfied, so no caller has to branch on the option itself.
 */
export const challengeSatisfied = (challenge: string | undefined, typed: string): boolean =>
  challenge === undefined || matchesChallenge(typed, challenge);
