#!/usr/bin/env node
/* Removes a question from its block (the question itself is kept in the survey,
 * so this is reversible from the Qualtrics UI).
 *
 *   node qualtrics/hide-question.mjs SV_xxx QID62 [--dry-run]
 *
 * Used to retire the "paste your result code" question, which only made sense
 * when the game was hosted elsewhere and handed back a code.
 */
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const DC = env.QUALTRICS_DATACENTER_ID || 'yul1';
const BASE = `https://${DC}.qualtrics.com/API/v3`;
const H = { 'X-API-TOKEN': env.QUALTRICS_API_TOKEN, 'Content-Type': 'application/json' };

const [, , SID, QID] = process.argv;
const DRY = process.argv.includes('--dry-run');
if (!SID || !QID) { console.error('usage: hide-question.mjs <surveyId> <QID> [--dry-run]'); process.exit(1); }

const def = (await (await fetch(`${BASE}/survey-definitions/${SID}`, { headers: H })).json()).result;
console.log(`  survey: ${def.SurveyName} (${def.SurveyStatus})`);
if (def.SurveyStatus === 'Active' && !process.argv.includes('--force')) {
  console.error('  REFUSING: survey is Active.'); process.exit(1);
}

const Q = def.Questions[QID];
if (!Q) { console.error(`  ${QID} not found`); process.exit(1); }
console.log(`  question: ${QID} ${Q.QuestionType}/${Q.Selector}  validation=${JSON.stringify(Q.Validation?.Settings?.ForceResponse || 'none')}`);

// Any display logic elsewhere that depends on it?
const refs = Object.entries(def.Questions)
  .filter(([qid, q]) => qid !== QID && JSON.stringify(q.DisplayLogic || {}).includes(QID))
  .map(([qid]) => qid);
const flowRef = JSON.stringify(def.SurveyFlow).includes(QID);
console.log(`  referenced by display logic: ${refs.length ? refs.join(', ') : 'none'} | in flow logic: ${flowRef}`);
if (refs.length || flowRef) {
  console.error('  REFUSING: something still depends on this question. Handle it manually.');
  process.exit(1);
}

let targetBlock = null;
for (const [bid, b] of Object.entries(def.Blocks || {})) {
  if ((b.BlockElements || []).some(e => e.QuestionID === QID)) targetBlock = [bid, b];
}
if (!targetBlock) { console.log('  not in any block already — nothing to do'); process.exit(0); }
const [bid, block] = targetBlock;
console.log(`  block: ${bid} "${block.Description}" (${block.BlockElements.length} elements)`);

if (DRY) { console.log('  --dry-run: nothing written'); process.exit(0); }

const newBlock = { ...block, BlockElements: block.BlockElements.filter(e => e.QuestionID !== QID) };
const r = await fetch(`${BASE}/survey-definitions/${SID}/blocks/${bid}`, {
  method: 'PUT', headers: H, body: JSON.stringify(newBlock)
});
console.log('  PUT block ->', r.status);
if (!r.ok) { console.error('   ', (await r.text()).slice(0, 300)); process.exit(1); }

const after = (await (await fetch(`${BASE}/survey-definitions/${SID}`, { headers: H })).json()).result;
const stillShown = Object.values(after.Blocks).some(b => (b.BlockElements || []).some(e => e.QuestionID === QID));
console.log('  VERIFY  removed from block:', stillShown ? 'NO' : 'yes',
  '| question still exists in survey:', after.Questions[QID] ? 'yes (recoverable)' : 'no');
console.log('  VERIFY  other questions intact:', Object.keys(after.Questions).length, '/', Object.keys(def.Questions).length);
