// Wspólne typy dla optymalizacji rozmiaru
export type EmptyObj = Record<string, never>;
export type StringMap = Record<string, string>;
export type AnyFunction = (...args: any[]) => any;
export type ComponentSelector = string;
