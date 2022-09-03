export function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;
