import Decimal from "./decimal.js";
Decimal.set({ precision: 40 });
export const COLORS = [
  "#28795e",
  "#6a9b84",
  "#dfaf60",
  "#7c83ae",
  "#ce8d83",
  "#7cabb5",
  "#a49b83",
];
export const KEY = "marketing-budget-plan-v1";
export function freshPlan() {
  return {
    schemaVersion: 1,
    year: new Date().getFullYear(),
    currency: "PLN",
    budget: "100000",
    categories: [
      "Social media",
      "WWW",
      "Radio",
      "Telewizja",
      "Prasa",
      "Outdoor",
      "Inne",
    ].map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      share: ["40", "35", "25", "0", "0", "0", "0"][i],
      roi: ["50", "100", "20", "", "", "", ""][i],
      color: COLORS[i],
    })),
    updatedAt: new Date().toISOString(),
  };
}
export function parse(value, min, max, required = true) {
  const s = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!s) return { value: null, error: required ? "Uzupełnij pole." : null };
  if (!/^-?\d+(\.\d{1,2})?$/.test(s))
    return {
      value: null,
      error: "Podaj liczbę z maks. 2 miejscami po przecinku.",
    };
  const n = new Decimal(s);
  if (n.lt(min) || (max !== undefined && n.gt(max)))
    return {
      value: null,
      error:
        max !== undefined
          ? `Podaj wartość od ${min} do ${max}.`
          : `Minimum to ${min}%.`,
    };
  return { value: n, error: null };
}
export function calculate(plan) {
  const budget = parse(plan.budget, 0);
  if (budget.value?.lte(0)) budget.error = "Budżet musi być większy od 0.";
  const names = plan.categories.map((c) =>
    c.name.trim().toLocaleLowerCase("pl"),
  );
  const rows = plan.categories.map((c, i) => {
    const nameError = !names[i]
      ? "Podaj nazwę."
      : c.name.trim().length > 60
        ? "Maksymalnie 60 znaków."
        : names.filter((n) => n === names[i]).length > 1
          ? "Nazwa musi być unikalna."
          : null;
    const share = parse(c.share, 0, 100);
    const roi = parse(c.roi, -100, undefined, !!share.value?.gt(0));
    const cost =
      !budget.error && !share.error
        ? budget.value.mul(share.value).div(100)
        : null;
    const profit =
      cost && !roi.error
        ? cost.isZero()
          ? new Decimal(0)
          : cost.mul(roi.value).div(100)
        : null;
    return {
      ...c,
      nameError,
      shareError: share.error,
      roiError: roi.error,
      p: share.value,
      r: roi.value,
      cost,
      profit,
      benefit: profit !== null ? cost.add(profit) : null,
    };
  });
  const allocationValid =
    !budget.error && rows.every((r) => !r.shareError && !r.nameError);
  const sum = rows.every((r) => !r.shareError)
    ? rows.reduce((s, r) => s.add(r.p), new Decimal(0))
    : null;
  const cost = allocationValid
    ? rows.reduce((s, r) => s.add(r.cost), new Decimal(0))
    : null;
  const valid =
    allocationValid && sum.lte(100) && rows.every((r) => !r.roiError);
  const profit = valid
    ? rows.reduce((s, r) => s.add(r.profit), new Decimal(0))
    : null;
  return {
    budget,
    rows,
    sum,
    cost,
    valid,
    allocationValid,
    profit,
    benefit: valid ? cost.add(profit) : null,
    remaining: cost ? budget.value.sub(cost) : null,
    roi: valid && cost.gt(0) ? profit.div(cost).mul(100) : null,
  };
}
export const money = (n) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
      }).format(Number(n.toFixed(2)));
export const percent = (n) =>
  n === null || n === undefined
    ? "—"
    : `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(Number(n.toFixed(2)))}%`;
export function isPlan(p) {
  return (
    p?.schemaVersion === 1 &&
    p.currency === "PLN" &&
    Number.isInteger(p.year) &&
    typeof p.budget === "string" &&
    Array.isArray(p.categories) &&
    p.categories.every(
      (c) =>
        typeof c.id === "string" &&
        /^[A-Za-z0-9_-]+$/.test(c.id) &&
        typeof c.name === "string" &&
        typeof c.share === "string" &&
        (typeof c.roi === "string" || c.roi === null) &&
        /^#[0-9a-f]{6}$/i.test(c.color),
    ) &&
    new Set(p.categories.map((c) => c.id)).size === p.categories.length
  );
}
