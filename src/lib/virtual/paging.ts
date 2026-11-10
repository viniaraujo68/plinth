export interface PageSpan {
  first: number;
  last: number;
}

export const pageSpan = (
  start: number,
  end: number,
  pageSize: number,
  knownCount: number | null,
): PageSpan | null => {
  const first = Math.floor(Math.max(0, start) / pageSize);
  const last = Math.max(first, Math.floor(Math.max(0, end) / pageSize));
  if (knownCount === null) return { first, last };
  if (knownCount <= 0) return null;
  const lastPage = Math.ceil(knownCount / pageSize) - 1;
  const cappedLast = Math.min(last, lastPage);
  return { first: Math.min(first, cappedLast), last: cappedLast };
};
