import assert from 'node:assert/strict';

import {
  getOpeSummaryExportColumns,
  getPolicyComparisonExportColumns,
  getSandboxSummaryExportColumns
} from '../src/lib/analysis/engine.js';
import {
  getBaselineModelRegistry,
  getPolicyModelMetadata,
  normalizeResearchModel,
  RESEARCH_MODEL_STATUSES,
  RESEARCH_MODEL_TYPES
} from '../src/lib/researchStudy.js';

const baselineRegistry = getBaselineModelRegistry();
const byPolicy = new Map(baselineRegistry.map((entry) => [entry.policy_name, entry]));

for (const policyName of [
  'heuristic_route_score',
  'behavior_cloning_linear',
  'reward_model_linear',
  'contextual_bandit_linear',
  'CQL',
  'IQL',
  'oracle_optimal'
]) {
  assert.ok(byPolicy.has(policyName), `missing baseline policy ${policyName}`);
}

assert.equal(byPolicy.get('heuristic_route_score').model_type, RESEARCH_MODEL_TYPES.HEURISTIC);
assert.equal(byPolicy.get('behavior_cloning_linear').model_type, RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING);
assert.equal(byPolicy.get('reward_model_linear').model_type, RESEARCH_MODEL_TYPES.REWARD_MODEL);
assert.equal(byPolicy.get('contextual_bandit_linear').model_type, RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT);
assert.equal(byPolicy.get('CQL').model_type, RESEARCH_MODEL_TYPES.OFFLINE_RL);
assert.equal(byPolicy.get('IQL').model_type, RESEARCH_MODEL_TYPES.OFFLINE_RL);
assert.equal(byPolicy.get('oracle_optimal').model_type, RESEARCH_MODEL_TYPES.REFERENCE);
assert.equal(byPolicy.get('CQL').implementation_status, RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED);
assert.equal(byPolicy.get('IQL').implementation_status, RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED);
assert.equal(byPolicy.get('oracle_optimal').implementation_status, RESEARCH_MODEL_STATUSES.IMPLEMENTED);
assert.equal(byPolicy.get('CQL').is_active, false);
assert.equal(byPolicy.get('IQL').is_active, false);

const draftCql = normalizeResearchModel({
  algorithm: 'CQL',
  policy_name: 'CQL',
  status: 'draft',
  is_active: true
});
assert.equal(draftCql.model_type, RESEARCH_MODEL_TYPES.OFFLINE_RL);
assert.equal(draftCql.implementation_status, RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED);
assert.equal(draftCql.is_active, false);

const trainedCql = normalizeResearchModel({
  algorithm: 'CQL',
  policy_name: 'CQL',
  implementation_status: 'trained',
  is_active: true,
  training_provenance: {
    trained: true,
    training_data_source: 'frozen treatment trajectories',
    training_rows: 12000,
    artifact_status: 'registered'
  }
});
assert.equal(trainedCql.model_type, RESEARCH_MODEL_TYPES.OFFLINE_RL);
assert.equal(trainedCql.implementation_status, RESEARCH_MODEL_STATUSES.TRAINED);
assert.equal(trainedCql.is_active, true);
assert.equal(trainedCql.training_provenance.training_rows, 12000);

const linearOpe = normalizeResearchModel({
  algorithm: 'linear_ope_proxy',
  policy_name: 'linear_ope_proxy',
  is_active: true
});
assert.notEqual(linearOpe.model_type, RESEARCH_MODEL_TYPES.OFFLINE_RL);
assert.equal(linearOpe.model_type, RESEARCH_MODEL_TYPES.UNSUPPORTED);
assert.equal(linearOpe.is_active, false);

const rewardMetadata = getPolicyModelMetadata('reward_model_linear');
assert.equal(rewardMetadata.model_type, RESEARCH_MODEL_TYPES.REWARD_MODEL);
assert.equal(rewardMetadata.implementation_status, RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE);

for (const columns of [
  getPolicyComparisonExportColumns(),
  getOpeSummaryExportColumns(),
  getSandboxSummaryExportColumns()
]) {
  assert.ok(columns.includes('model_type'));
  assert.ok(columns.includes('implementation_status'));
  assert.ok(columns.includes('training_mode'));
  assert.ok(columns.includes('training_data_source'));
  assert.ok(columns.includes('training_rows'));
}

assert.ok(getOpeSummaryExportColumns().includes('ope_estimator_family'));

console.log('model registry maturity tests passed');
