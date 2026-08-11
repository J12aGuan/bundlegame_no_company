#!/usr/bin/env node
/* Swaps a Qualtrics survey's hosted-game question for the native build.
 *
 *   node qualtrics/apply-to-survey.mjs SV_xxx qualtrics/dist/bundlegame.control.js [--question QID18] [--dry-run]
 *
 * What it does, and only this:
 *   1. replaces the target question's HTML (iframe -> mount div) and its JS
 *   2. adds the bg_* embedded data fields to the survey flow, keeping existing ones
 *
 * It refuses to run against an Active survey unless --force is given, so a live
 * study cannot be edited by accident.
 */
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const TOKEN = env.QUALTRICS_API_TOKEN;
const DC = env.QUALTRICS_DATACENTER_ID || 'yul1';
const BASE = `https://${DC}.qualtrics.com/API/v3`;
const H = { 'X-API-TOKEN': TOKEN, 'Content-Type': 'application/json' };

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const [, , SID, JSPATH] = process.argv;
const QID = arg('question', 'QID18');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (!SID || !JSPATH) { console.error('usage: apply-to-survey.mjs <surveyId> <built.js> [--question QID18] [--dry-run]'); process.exit(1); }
const gameJs = fs.readFileSync(JSPATH, 'utf8');

const maxChunks = Number((gameJs.match(/MAX_EVENT_CHUNKS:\s*(\d+)/) || [])[1] || 8);
// Read the namespace and telemetry setting out of the build, so a second game
// question (e.g. practice) declares its own fields instead of the main game's.
const PREFIX = (gameJs.match(/FIELD_PREFIX:\s*'([^']*)'/) || [])[1] || 'bg_';
const DETAILED = !/DETAILED_TELEMETRY:\s*false/.test(gameJs);
const BG_FIELDS = [
  'bg_participant_id', 'bg_dataset', 'bg_arm', 'bg_round_reached', 'bg_round_current',
  'bg_rounds_completed', 'bg_earnings', 'bg_session_seconds', 'bg_finished',
  'bg_decisions', 'bg_timing', 'bg_events_chunks', 'bg_events_count',
  'bg_events_truncated', 'bg_events_dropped_chars', 'bg_recommendation_unavailable',
  'bg_tutorial_completed', 'bg_tutorial_unavailable', 'bg_tutorial_rounds_done',
  'bg_image_load_failed'
];
BG_FIELDS.push('bg_resumed', 'bg_firebase_ok', 'bg_firebase_failed', 'bg_firebase_dropped', 'bg_firebase_last_error');
if (DETAILED) for (let i = 1; i <= maxChunks; i++) BG_FIELDS.push(`bg_events_${i}`);
// re-namespace: the engine rewrites bg_* -> PREFIX* at write time
const FIELDS = BG_FIELDS.map(f => PREFIX + f.slice(3));

const get = async (u) => { const r = await fetch(BASE + u, { headers: H }); const t = await r.text(); return { ok: r.ok, status: r.status, body: t }; };
const put = async (u, b) => { const r = await fetch(BASE + u, { method: 'PUT', headers: H, body: JSON.stringify(b) }); return { ok: r.ok, status: r.status, body: await r.text() }; };

const defRes = await get(`/survey-definitions/${SID}`);
if (!defRes.ok) { console.error('cannot read survey:', defRes.status, defRes.body.slice(0, 200)); process.exit(1); }
const def = JSON.parse(defRes.body).result;

console.log(`  survey : ${def.SurveyName}`);
console.log(`  status : ${def.SurveyStatus}`);
if (def.SurveyStatus === 'Active' && !FORCE) {
  console.error('\n  REFUSING: this survey is Active. Edit a copy, or pass --force if you really mean it.');
  process.exit(1);
}

const Q = def.Questions[QID];
if (!Q) { console.error(`  question ${QID} not found`); process.exit(1); }
const hadIframe = /<iframe/i.test(String(Q.QuestionText || ''));
console.log(`  target : ${QID} (${Q.QuestionType}/${Q.Selector})  iframe present: ${hadIframe}`);

// Keep the surrounding copy and styling; drop only the iframe block.
let text = String(Q.QuestionText || '');
text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, '<div id="bundlegame-mount"></div>');
if (!/bundlegame-mount/.test(text)) text += '\n<div id="bundlegame-mount"></div>';
// The hosted build told people not to refresh; the native one is the same in that
// respect (no resume), so the warning stays.

const newQ = { ...Q, QuestionText: text, QuestionJS: gameJs };

// Flow: append an embedded-data element with the bg_* fields, preserving what is there.
const flow = def.SurveyFlow;
const existing = new Set((JSON.stringify(flow).match(/"Field":"[^"]+"/g) || []).map(s => s.slice(9, -1)));
const toAdd = FIELDS.filter(f => !existing.has(f));
const maxFlowId = Math.max(0, ...(JSON.stringify(flow).match(/"FlowID":"FL_(\d+)"/g) || []).map(s => Number(s.match(/\d+/)[0])));
const edElement = {
  Type: 'EmbeddedData', FlowID: `FL_${maxFlowId + 1}`,
  EmbeddedData: toAdd.map(f => ({ Description: f, Type: 'Custom', Field: f, VariableType: 'String', DataVisibility: [], AnalyzeText: false, Value: '' }))
};

console.log(`  flow   : ${existing.size} existing fields, adding ${toAdd.length} ${PREFIX}* fields (telemetry: ${DETAILED ? 'detailed' : 'summary only'})`);
console.log(`  js     : ${gameJs.length} chars`);

if (DRY) { console.log('\n  --dry-run: nothing written'); process.exit(0); }

const qRes = await put(`/survey-definitions/${SID}/questions/${QID}`, newQ);
console.log(`  PUT question -> ${qRes.status}`);
if (!qRes.ok) { console.error('   ', qRes.body.slice(0, 300)); process.exit(1); }

if (toAdd.length) {
  const newFlow = { ...flow, Flow: [edElement, ...flow.Flow], Properties: { ...(flow.Properties || {}), Count: (flow.Flow.length + 1) } };
  const fRes = await put(`/survey-definitions/${SID}/flow`, newFlow);
  console.log(`  PUT flow     -> ${fRes.status}`);
  if (!fRes.ok) { console.error('   ', fRes.body.slice(0, 300)); process.exit(1); }
}

// read back and verify
const after = JSON.parse((await get(`/survey-definitions/${SID}`)).body).result;
const AQ = after.Questions[QID];
const afterFields = new Set((JSON.stringify(after.SurveyFlow).match(/"Field":"[^"]+"/g) || []).map(s => s.slice(9, -1)));
const missing = FIELDS.filter(f => !afterFields.has(f));
console.log('\n  VERIFY');
console.log('    question JS installed :', AQ.QuestionJS === gameJs ? 'yes (byte-identical)' : 'NO');
console.log('    iframe removed        :', !/<iframe/i.test(String(AQ.QuestionText || '')) ? 'yes' : 'NO');
console.log('    mount div present     :', /bundlegame-mount/.test(String(AQ.QuestionText || '')) ? 'yes' : 'NO');
console.log(`    ${PREFIX}* fields declared:`, `${FIELDS.length - missing.length}/${FIELDS.length}`);
if (missing.length) console.log('    MISSING:', missing.join(', '));
console.log('    questions preserved   :', Object.keys(after.Questions).length, '(was', Object.keys(def.Questions).length + ')');
console.log('    blocks preserved      :', Object.keys(after.Blocks).length, '(was', Object.keys(def.Blocks).length + ')');
console.log(`\n  edit: https://berkeley.${DC}.qualtrics.com/survey-builder/${SID}/edit`);
