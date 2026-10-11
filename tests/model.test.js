import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, parse } from "../src/model.js";
const plan = (budget, entries) => ({
  budget,
  categories: entries.map(([share, roi], i) => ({
    id: String(i),
    name: `Kanał ${i}`,
    share,
    roi,
  })),
});
test("reference plan: weighted ROI and benefit", () => {
  const r = calculate(
    plan("100000", [
      ["40", "50"],
      ["35", "100"],
      ["25", "20"],
    ]),
  );
  assert.equal(r.cost.toString(), "100000");
  assert.equal(r.profit.toString(), "60000");
  assert.equal(r.roi.toString(), "60");
  assert.equal(r.benefit.toString(), "160000");
});
test("partial allocation uses allocated cost as ROI denominator", () => {
  const r = calculate(plan("100000", [["40", "50"]]));
  assert.equal(r.remaining.toString(), "60000");
  assert.equal(r.profit.toString(), "20000");
  assert.equal(r.roi.toString(), "50");
});
test("over allocation suspends whole-plan forecast", () => {
  const r = calculate(
    plan("100000", [
      ["60", "50"],
      ["50", "20"],
    ]),
  );
  assert.equal(r.sum.toString(), "110");
  assert.equal(r.remaining.toString(), "-10000");
  assert.equal(r.profit, null);
  assert.equal(r.valid, false);
});
test("loss and ROI over 100 are accepted", () => {
  for (const [roi, profit, benefit] of [
    ["-100", "-10000", "0"],
    ["200", "20000", "30000"],
  ]) {
    const r = calculate(plan("10000", [["100", roi]]));
    assert.equal(r.profit.toString(), profit);
    assert.equal(r.benefit.toString(), benefit);
  }
});
test("missing active ROI clears forecast; zero shares permit empty ROI", () => {
  assert.equal(calculate(plan("10000", [["100", ""]])).profit, null);
  const r = calculate(plan("10000", [["0", ""]]));
  assert.equal(r.profit.toString(), "0");
  assert.equal(r.roi, null);
  assert.equal(r.remaining.toString(), "10000");
});
test("decimal inputs remain exact, accept comma, and sums use unrounded values", () => {
  const r = calculate(
    plan("100,01", [
      ["33.33", "10"],
      ["33,33", "10"],
      ["33.34", "10"],
    ]),
  );
  assert.equal(r.sum.toString(), "100");
  assert.equal(r.cost.toString(), "100.01");
  assert.equal(r.profit.toString(), "10.001");
});
test("invalid, blank, out-of-range and overly precise values are rejected", () => {
  for (const v of ["", "NaN", "Infinity", "1e3", "1.001", "-1", "101"])
    assert.ok(parse(v, 0, 100).error);
  assert.ok(parse("-101", -100).error);
  assert.equal(calculate(plan("0", [["100", "50"]])).valid, false);
  const p = plan("100", [["100", "50"]]);
  p.categories[0].share = "oops";
  assert.equal(calculate(p).profit, null);
});
test("category names must be trimmed, unique, and within 60 characters", () => {
  const p = plan("100", [
    ["50", "50"],
    ["50", "50"],
  ]);
  p.categories[0].name = " social ";
  p.categories[1].name = "SOCIAL";
  assert.equal(calculate(p).valid, false);
  p.categories[1].name = "";
  assert.ok(calculate(p).rows[1].nameError);
  p.categories[1].name = "x".repeat(61);
  assert.ok(calculate(p).rows[1].nameError);
});
test("exact arithmetic rounds positive and negative half cents only at display", () => {
  const positive = calculate(plan("100,05", [["100", "10"]]));
  assert.equal(positive.profit.toString(), "10.005");
  assert.equal(positive.profit.toFixed(2), "10.01");
  const negative = calculate(plan("100,05", [["100", "-10"]]));
  assert.equal(negative.profit.toFixed(2), "-10.01");
  const repeating = calculate(
    plan("100", [
      ["3", "100"],
      ["4", "0"],
    ]),
  );
  assert.equal(repeating.roi.toFixed(2), "42.86");
});
