import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiStudyProtocol,
  normalizeResearchStudyProtocol,
  assignArmBlocked,
  assignDynamicArm,
} from "../../src/lib/researchStudy.js";

const proto = normalizeResearchStudyProtocol(buildChiStudyProtocol());
const arms = proto.policy_arms.map((a) => a.id);

function blockedCounts(n) {
  const c = Object.fromEntries(arms.map((a) => [a, 0]));
  for (let i = 0; i < n; i += 1) c[assignArmBlocked(i, proto).id] += 1;
  return c;
}

test("the dynamic protocol ships with assignment_scheme = blocked", () => {
  assert.equal(proto.assignment_scheme, "blocked");
  assert.equal(arms.length, 4);
});

test("arms are EXACTLY equal at every multiple of 4 (40, 200, 400 and all in between)", () => {
  for (const n of [40, 200, 400]) {
    const c = blockedCounts(n);
    for (const a of arms) assert.equal(c[a], n / 4, `arm ${a} at n=${n}`);
  }
  for (let n = 4; n <= 400; n += 4) {
    const c = blockedCounts(n);
    for (const a of arms) assert.equal(c[a], n / 4);
  }
});

test("the marginal and aggregate primary-contrast arms are equal-n", () => {
  for (const n of [40, 200, 400]) {
    const c = blockedCounts(n);
    assert.equal(c.marginal, c.aggregate, `marginal==aggregate at n=${n}`);
  }
});

test("every block of 4 contains all 4 arms exactly once", () => {
  for (let b = 0; b < 200; b += 1) {
    const ids = new Set([0, 1, 2, 3].map((k) => assignArmBlocked(b * 4 + k, proto).id));
    assert.equal(ids.size, 4, `block ${b} must contain all 4 arms`);
  }
});

test("assignment is deterministic / reproducible (seeded)", () => {
  for (const i of [0, 7, 123, 399]) {
    assert.equal(assignArmBlocked(i, proto).id, assignArmBlocked(i, proto).id);
  }
});

test("the dispatcher honors the flag and is reversible back to hash", () => {
  const blocked = assignDynamicArm({ enrollmentIndex: 5, protocol: proto });
  assert.equal(blocked.method, "blocked_randomization");

  // blocked scheme but no index available -> honest hash fallback (method names the truth)
  const fallback = assignDynamicArm({ participantId: "PID_5", protocol: proto });
  assert.equal(fallback.method, "stable_hash_fallback");

  // flip the one flag -> hash scheme, even with an index present
  const hashProto = normalizeResearchStudyProtocol(
    buildChiStudyProtocol({ assignment_scheme: "hash" }),
  );
  const hashed = assignDynamicArm({ participantId: "PID_5", enrollmentIndex: 5, protocol: hashProto });
  assert.equal(hashed.method, "stable_hash");
});
