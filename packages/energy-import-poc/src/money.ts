const decimal = /^(0|[1-9]\d*)(\.\d{1,6})?$/;

export function moneyToMicros(value: string): bigint {
  if (!decimal.test(value)) throw new Error('Money must be a non-negative decimal string');
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
}

export function microsToMoney(value: bigint): string {
  if (value < 0) throw new Error('Money cannot be negative');
  return `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, '0')}`;
}
