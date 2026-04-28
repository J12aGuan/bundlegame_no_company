import assert from 'node:assert/strict';

import {
  BUNDLEGAME_STUDY_PROTOCOL_VERSION,
  BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  getCanonicalResearchStudyProtocol,
  validateResearchProtocolDefinition,
  validateResearchProtocolSnapshot
} from '../src/lib/researchStudy.js';

function buildScenario(round) {
  const phase = round <= 15 ? 'A' : round <= 35 ? 'B' : 'C';
  return {
    round,
    phase,
    scenario_id: `${phase}${String(round).padStart(2, '0')}`,
    order_ids: [`R${round}_A`, `R${round}_B`, `R${round}_C`, `R${round}_D`],
    orders: []
  };
}

const canonical = getCanonicalResearchStudyProtocol({ enabled: true });
const definitionValidation = validateResearchProtocolDefinition(canonical);
assert.equal(definitionValidation.ok, true);
assert.equal(canonical.protocol_version, BUNDLEGAME_STUDY_PROTOCOL_VERSION);
assert.equal(canonical.expected_total_rounds, BUNDLEGAME_STUDY_TOTAL_ROUNDS);
assert.deepEqual(canonical.phase_plan.map((phase) => phase.rounds), [15, 20, 15]);
assert.deepEqual(canonical.phase_plan.map((phase) => phase.recommendations_enabled), [false, true, false]);

const validScenarioBundle = {
  scenarios: Array.from({ length: BUNDLEGAME_STUDY_TOTAL_ROUNDS }, (_, index) => buildScenario(index + 1)),
  metadata: {
    protocol_version: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
    expected_total_rounds: BUNDLEGAME_STUDY_TOTAL_ROUNDS
  }
};

const validSnapshot = validateResearchProtocolSnapshot({
  centralConfig: {
    scenario_set: 'mainGame',
    research_protocol: {
      protocol_version: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
      expected_total_rounds: BUNDLEGAME_STUDY_TOTAL_ROUNDS
    }
  },
  scenarioBundle: validScenarioBundle,
  studyProtocol: canonical,
  datasetRoot: 'mainGame'
});
assert.equal(validSnapshot.ok, true);

const oldDefaultValidation = validateResearchProtocolDefinition({
  ...canonical,
  phase_plan: [
    { id: 'A', rounds: 6, recommendations_enabled: false },
    { id: 'B', rounds: 12, recommendations_enabled: true },
    { id: 'C', rounds: 6, recommendations_enabled: false }
  ],
  expected_total_rounds: 24
});
assert.equal(oldDefaultValidation.ok, false);
assert.match(oldDefaultValidation.errors.join('; '), /50|Phase|phase_plan/);

const mismatchedScenarioBundle = {
  ...validScenarioBundle,
  scenarios: validScenarioBundle.scenarios.map((scenario) => ({ ...scenario }))
};
mismatchedScenarioBundle.scenarios[15].phase = 'A';
const mismatchedSnapshot = validateResearchProtocolSnapshot({
  scenarioBundle: mismatchedScenarioBundle,
  studyProtocol: canonical,
  datasetRoot: 'mainGame'
});
assert.equal(mismatchedSnapshot.ok, false);
assert.match(mismatchedSnapshot.errors.join('; '), /round 16 phase must be B/);

const shortSnapshot = validateResearchProtocolSnapshot({
  scenarioBundle: {
    scenarios: validScenarioBundle.scenarios.slice(0, 49),
    metadata: validScenarioBundle.metadata
  },
  studyProtocol: canonical,
  datasetRoot: 'mainGame'
});
assert.equal(shortSnapshot.ok, false);
assert.match(shortSnapshot.errors.join('; '), /50 scenarios|missing scenario round 50/);

const centralDrift = validateResearchProtocolSnapshot({
  centralConfig: {
    scenario_set: 'mainGame',
    research_protocol: {
      protocol_version: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
      expected_total_rounds: 24,
      phase_plan: [
        { id: 'A', rounds: 6, recommendations_enabled: false },
        { id: 'B', rounds: 12, recommendations_enabled: true },
        { id: 'C', rounds: 6, recommendations_enabled: false }
      ]
    }
  },
  scenarioBundle: validScenarioBundle,
  studyProtocol: canonical,
  datasetRoot: 'mainGame'
});
assert.equal(centralDrift.ok, false);
assert.match(centralDrift.errors.join('; '), /centralConfig|expected_total_rounds|phase_plan/);

console.log('research protocol validation tests passed');
