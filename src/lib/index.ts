/**
 * The published version of this package.
 *
 * Declared as a literal instead of being read back from `package.json`: the packaged output has
 * no portable way to import its own manifest, and a consumer that only wants to log a version
 * should not have to bundle one. `version.spec.ts` fails when this drifts from the manifest.
 */
export const LIBRARY_VERSION = "0.1.0";
