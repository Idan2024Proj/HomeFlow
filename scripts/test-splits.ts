import assert from "node:assert/strict";
import {
  splitEqual,
  splitByPercent,
  splitCustom,
  splitPersonal,
} from "../src/lib/finance/splits.ts";

assert.deepEqual(splitPersonal(100, "a"), [
  { userId: "a", shareAmount: 100, sharePercent: 100 },
]);

const equal = splitEqual(100, [{ userId: "a" }, { userId: "b" }]);
assert.equal(equal[0].shareAmount + equal[1].shareAmount, 100);

const percent = splitByPercent(200, [
  { userId: "a", percent: 60 },
  { userId: "b", percent: 40 },
]);
assert.equal(percent[0].shareAmount, 120);
assert.equal(percent[1].shareAmount, 80);

const custom = splitCustom(90, [
  { userId: "a", shareAmount: 30 },
  { userId: "b", shareAmount: 60 },
]);
assert.equal(custom[0].sharePercent, 33.33);

console.log("finance splits ok");
