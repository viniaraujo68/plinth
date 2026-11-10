import type { UrlStateCodec } from "./codec.js";

export interface ParamHandler<T> {
  readonly defaultValue: T;
  read: (values: readonly string[]) => T;
  write: (value: T) => string[];
}

export interface ScalarParamHandler<
  Value,
  T extends Value | undefined = Value | undefined,
> extends ParamHandler<T> {
  decode: (raw: string) => Value | undefined;
  encode: (value: Value) => string | undefined;
}

export interface NumberParamOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

const scalar = <Value, T extends Value | undefined>(
  decode: (raw: string) => Value | undefined,
  encode: (value: Value) => string | undefined,
  defaultValue: T,
): ScalarParamHandler<Value, T> => {
  const encodePresent = (value: Value | null | undefined): string | undefined => {
    if (value === null || value === undefined) return undefined;
    const encoded = encode(value);
    return encoded === "" ? undefined : encoded;
  };
  const encodedDefault = encodePresent(defaultValue);

  return {
    defaultValue,
    decode,
    encode,
    read: (values) => {
      if (values.length === 0) return defaultValue;
      return (decode(values[0]) ?? defaultValue) as T;
    },
    write: (value) => {
      const encoded = encodePresent(value);
      return encoded === undefined || encoded === encodedDefault ? [] : [encoded];
    },
  };
};

function string<const T extends string>(options: {
  oneOf: readonly T[];
  default: NoInfer<T>;
}): ScalarParamHandler<T, T>;
function string<const T extends string>(options: {
  oneOf: readonly T[];
  default?: undefined;
}): ScalarParamHandler<T, T | undefined>;
function string(options: { default: string }): ScalarParamHandler<string, string>;
function string(options?: { default?: undefined }): ScalarParamHandler<string, string | undefined>;
function string<T extends string | undefined>(
  options: { oneOf?: readonly string[]; default?: T } = {},
): ScalarParamHandler<string, T> {
  const { oneOf } = options;
  const accepts = (value: string) => oneOf === undefined || oneOf.includes(value);
  return scalar<string, T>(
    (raw) => (accepts(raw) ? raw : undefined),
    (value) => (typeof value === "string" && accepts(value) ? value : undefined),
    options.default as T,
  );
}

function number(
  options: NumberParamOptions & { default: number },
): ScalarParamHandler<number, number>;
function number(
  options?: NumberParamOptions & { default?: undefined },
): ScalarParamHandler<number, number | undefined>;
function number<T extends number | undefined>(
  options: NumberParamOptions & { default?: T } = {},
): ScalarParamHandler<number, T> {
  const { min = -Infinity, max = Infinity, integer = false } = options;
  const accepts = (value: unknown): value is number =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    (!integer || Number.isInteger(value)) &&
    value >= min &&
    value <= max;

  return scalar<number, T>(
    (raw) => {
      const trimmed = raw.trim();
      if (trimmed === "") return undefined;
      const value = Number(trimmed);
      return accepts(value) ? value : undefined;
    },
    (value) => (accepts(value) ? String(value) : undefined),
    options.default as T,
  );
}

const decodeBoolean = (raw: string): boolean | undefined => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
};

function boolean(options: { default: boolean }): ScalarParamHandler<boolean, boolean>;
function boolean(options?: {
  default?: undefined;
}): ScalarParamHandler<boolean, boolean | undefined>;
function boolean<T extends boolean | undefined>(
  options: { default?: T } = {},
): ScalarParamHandler<boolean, T> {
  return scalar<boolean, T>(
    decodeBoolean,
    (value) => (typeof value === "boolean" ? String(value) : undefined),
    options.default as T,
  );
}

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const decodeCalendarDate = (raw: string): Date | undefined => {
  const match = CALENDAR_DATE.exec(raw);
  if (match === null) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  const sameDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return sameDay ? date : undefined;
};

const pad = (value: number, width: number): string => String(value).padStart(width, "0");

const encodeCalendarDate = (value: Date): string | undefined => {
  if (!isValidDate(value)) return undefined;
  const year = value.getFullYear();
  if (year < 0 || year > 9999) return undefined;
  return `${pad(year, 4)}-${pad(value.getMonth() + 1, 2)}-${pad(value.getDate(), 2)}`;
};

function date(options: { default: Date }): ScalarParamHandler<Date, Date>;
function date(options?: { default?: undefined }): ScalarParamHandler<Date, Date | undefined>;
function date<T extends Date | undefined>(
  options: { default?: T } = {},
): ScalarParamHandler<Date, T> {
  return scalar<Date, T>(decodeCalendarDate, encodeCalendarDate, options.default as T);
}

const decodeInstant = (raw: string): Date | undefined => {
  const time = Date.parse(raw);
  return Number.isNaN(time) ? undefined : new Date(time);
};

const encodeInstant = (value: Date): string | undefined =>
  isValidDate(value) ? value.toISOString() : undefined;

function datetime(options: { default: Date }): ScalarParamHandler<Date, Date>;
function datetime(options?: { default?: undefined }): ScalarParamHandler<Date, Date | undefined>;
function datetime<T extends Date | undefined>(
  options: { default?: T } = {},
): ScalarParamHandler<Date, T> {
  return scalar<Date, T>(decodeInstant, encodeInstant, options.default as T);
}

const list = <Value>(item: {
  decode: (raw: string) => Value | undefined;
  encode: (value: Value) => string | undefined;
}): ParamHandler<Value[]> => ({
  defaultValue: [],
  read: (values) => values.map((raw) => item.decode(raw)).filter((value) => value !== undefined),
  write: (value) =>
    (Array.isArray(value) ? value : [])
      .filter((entry) => entry !== null && entry !== undefined)
      .map((entry) => item.encode(entry))
      .filter((encoded): encoded is string => encoded !== undefined && encoded !== ""),
});

export const param = { string, number, boolean, date, datetime, list };

export type ParamsDefinition<State> = { [Field in keyof State]: ParamHandler<State[Field]> };

export interface ParamsCodec<State> extends UrlStateCodec<State> {
  readonly definition: ParamsDefinition<State>;
  normalize: (state: State) => State;
}

export const createParamsCodec = <State extends object>(
  definition: ParamsDefinition<State>,
): ParamsCodec<State> => {
  const fields = Object.keys(definition) as (keyof State & string)[];

  const build = (valueOf: (field: keyof State & string) => unknown): State =>
    structuredClone(Object.fromEntries(fields.map((field) => [field, valueOf(field)]))) as State;

  const serialize = (state: State): URLSearchParams => {
    const params = new URLSearchParams();
    for (const field of fields)
      for (const value of definition[field].write(state[field])) params.append(field, value);
    return params;
  };

  const parse = (params: URLSearchParams): State =>
    build((field) => definition[field].read(params.getAll(field)));

  return {
    definition,
    ownedParams: () => [...fields],
    createDefault: () => build((field) => definition[field].defaultValue),
    serialize,
    parse,
    normalize: (state) => parse(serialize(state)),
    key: (state) => serialize(state).toString(),
  };
};
