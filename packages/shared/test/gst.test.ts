import {
  gstThresholdFor,
  gstTransition,
  canPublishInterState,
  gstAlert,
} from "../src/gstMachine.js";
import assert from "node:assert";

// thresholds
assert.strictEqual(gstThresholdFor("Madhya Pradesh"), 40_00000, "MP threshold 40L");
assert.strictEqual(gstThresholdFor("Assam"), 20_00000, "special state 20L");
assert.strictEqual(gstThresholdFor("Himachal Pradesh"), 20_00000, "HP special 20L");

// inter-state
assert.strictEqual(canPublishInterState("NONE"), false, "unregistered cannot sell inter-state");
assert.strictEqual(canPublishInterState("ENROLMENT"), false, "enrolment still restricted");
assert.strictEqual(canPublishInterState("GSTIN"), true, "GSTIN may sell inter-state");

// transitions
const ctx = {
  intraStateOnly: true,
  annualTurnover: 5_00000,
  wantsInterState: false,
  state: "Madhya Pradesh",
};
assert.strictEqual(gstTransition("NONE", "ENROLMENT", ctx).allowed, true, "NONE -> ENROLMENT ok");
assert.strictEqual(gstTransition("ENROLMENT", "GSTIN", ctx).allowed, true, "ENROLMENT -> GSTIN ok");
assert.strictEqual(gstTransition("NONE", "GSTIN", ctx).allowed, true, "NONE -> GSTIN direct ok");

const interCtx = { ...ctx, wantsInterState: true };
const blocked = gstTransition("NONE", "ENROLMENT", interCtx);
assert.strictEqual(blocked.allowed, false, "inter-state intent while unregistered is hard-blocked");
assert.ok(blocked.reasonHi.length > 0, "spoken Hindi explanation present");

// alerts
assert.strictEqual(
  gstAlert({ ...ctx, annualTurnover: 10_00000 }),
  null,
  "far below threshold: no alert",
);
assert.ok(gstAlert({ ...ctx, annualTurnover: 35_00000 }) !== null, "approaching threshold alerts");
assert.ok(gstAlert({ ...ctx, annualTurnover: 45_00000 }) !== null, "crossed threshold alerts");

console.log("[gstMachine] all state machine tests passed");
