// Exact rational arithmetic using native BigInt. Rounding occurs only for display.
function gcd(a, b) {
  a = a < 0n ? -a : a;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
export default class Decimal {
  constructor(value = 0, denominator) {
    if (value instanceof Decimal) {
      this.n = value.n;
      this.d = value.d;
      return;
    }
    if (denominator !== undefined) {
      this.n = BigInt(value);
      this.d = BigInt(denominator);
    } else {
      const s = String(value);
      const [whole, fraction = ""] = s.replace("-", "").split(".");
      this.n = BigInt(whole + fraction) * (s.startsWith("-") ? -1n : 1n);
      this.d = 10n ** BigInt(fraction.length);
    }
    if (!this.d) throw new Error("Division by zero");
    if (this.d < 0n) {
      this.n = -this.n;
      this.d = -this.d;
    }
    const g = gcd(this.n, this.d);
    this.n /= g;
    this.d /= g;
  }
  static set() {}
  add(v) {
    v = new Decimal(v);
    return new Decimal(this.n * v.d + v.n * this.d, this.d * v.d);
  }
  sub(v) {
    v = new Decimal(v);
    return new Decimal(this.n * v.d - v.n * this.d, this.d * v.d);
  }
  mul(v) {
    v = new Decimal(v);
    return new Decimal(this.n * v.n, this.d * v.d);
  }
  div(v) {
    v = new Decimal(v);
    return new Decimal(this.n * v.d, this.d * v.n);
  }
  lt(v) {
    v = new Decimal(v);
    return this.n * v.d < v.n * this.d;
  }
  lte(v) {
    return !this.gt(v);
  }
  gt(v) {
    v = new Decimal(v);
    return this.n * v.d > v.n * this.d;
  }
  eq(v) {
    v = new Decimal(v);
    return this.n === v.n && this.d === v.d;
  }
  isZero() {
    return this.n === 0n;
  }
  abs() {
    return new Decimal(this.n < 0n ? -this.n : this.n, this.d);
  }
  toNumber() {
    return Number(this.n) / Number(this.d);
  }
  toFixed(places = 2) {
    const scale = 10n ** BigInt(places),
      n = (this.n < 0n ? -this.n : this.n) * scale;
    let rounded = n / this.d;
    if ((n % this.d) * 2n >= this.d) rounded++;
    const s = rounded.toString().padStart(places + 1, "0");
    return (
      (this.n < 0n && rounded !== 0n ? "-" : "") +
      (places ? s.slice(0, -places) + "." + s.slice(-places) : s)
    );
  }
  toString() {
    return this.toFixed(30).replace(/\.?0+$/, "") || "0";
  }
}
