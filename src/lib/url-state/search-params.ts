export const pickParams = (params: URLSearchParams, names: readonly string[]): URLSearchParams => {
  const picked = new URLSearchParams();
  for (const [name, value] of params) if (names.includes(name)) picked.append(name, value);
  return picked;
};

export const withOwnedParams = (
  url: URL,
  owned: readonly string[],
  params: URLSearchParams,
): URL => {
  const next = new URL(url);
  for (const name of owned) next.searchParams.delete(name);
  for (const [name, value] of params) next.searchParams.append(name, value);
  return next;
};

const sortedSearch = (params: URLSearchParams): string => {
  const sorted = new URLSearchParams(params);
  sorted.sort();
  return sorted.toString();
};

export const sameLocation = (a: URL, b: URL): boolean =>
  a.origin === b.origin &&
  a.pathname === b.pathname &&
  a.hash === b.hash &&
  sortedSearch(a.searchParams) === sortedSearch(b.searchParams);

export const changedParams = (previous: URLSearchParams, next: URLSearchParams): string[] => {
  const names = new Set([...previous.keys(), ...next.keys()]);
  return [...names].filter(
    (name) => JSON.stringify(previous.getAll(name)) !== JSON.stringify(next.getAll(name)),
  );
};
