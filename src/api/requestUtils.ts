export function csvNumbers(value: unknown): number[] | undefined {
  if (Array.isArray(value)) return nonEmptyNumbers(value);
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return nonEmptyNumbers(value.split(',').map((v) => v.trim()));
}

export function optionalNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return nonEmptyNumbers(value);
}

export function stringFrom(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function numberFrom(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function booleanFrom(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true' || value === 'on' || value === '1') return true;
    if (value === 'false' || value === '0' || value === '') return false;
  }
  return fallback;
}

function nonEmptyNumbers(values: unknown[]): number[] | undefined {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length > 0 ? nums : undefined;
}
