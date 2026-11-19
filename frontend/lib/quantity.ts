// Keep fixed-point quantities out of JavaScript Number, including fractional negatives.
export function formatQuantity(value: string, precision = 0): string {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new SyntaxError("Invalid decimal quantity");
  const [integer, fraction = ""] = value.split(".");
  const negative = integer.startsWith("-");
  const magnitude = negative ? integer.slice(1) : integer;
  return (negative ? "-" : "") +
    new Intl.NumberFormat("en-AE").format(BigInt(magnitude)) +
    (precision ? "." + fraction.padEnd(precision, "0").slice(0, precision) : "");
}

export function counterProgress(elapsed: number): number {
  // A RAF timestamp can precede the observer's performance.now() start sample.
  // Never let that first frame produce a negative interpolation for a positive value.
  return Math.max(0, Math.min(1, elapsed / 1400));
}

export function fixedQuantity(scaled: bigint, precision: number): string {
  const negative = scaled < BigInt(0);
  const digits = (negative ? -scaled : scaled).toString().padStart(precision + 1, "0");
  return (negative ? "-" : "") + (precision
    ? digits.slice(0, -precision) + "." + digits.slice(-precision)
    : digits);
}
