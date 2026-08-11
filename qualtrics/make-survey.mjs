#!/usr/bin/env node
/* Generates a Qualtrics .qsf you can import, with:
 *   - every bg_* embedded data field pre-declared in the Survey Flow
 *   - an optional Randomizer that assigns bg_ARM
 *   - the game question with the built JS already attached
 *
 *   node qualtrics/make-survey.mjs --name "BundleGame" --arms control,counterfactual
 *
 * Also writes embedded-data-fields.txt — the plain list, so the survey can be
 * built by hand if the import is rejected.
 *
 * NOTE: the .qsf is generated offline and has NOT been round-tripped through a
 * Qualtrics import (that needs an account). Treat it as a convenience; the
 * hand-build path in README.md is the verified one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const NAME = arg('name', 'BundleGame');
const ARMS = arg('arms', '').split(',').map(s => s.trim()).filter(Boolean);
const JS_PATH = arg('js', path.join(HERE, 'dist', 'bundlegame.qualtrics.js'));

if (!fs.existsSync(JS_PATH)) {
  console.error(`  ! built file not found: ${JS_PATH}\n    run: npm run qualtrics:build`);
  process.exit(1);
}
const gameJs = fs.readFileSync(JS_PATH, 'utf8');

// Outputs the engine writes. Declared with empty defaults so Qualtrics saves them.
const OUT_FIELDS = [
  'bg_participant_id', 'bg_dataset', 'bg_arm', 'bg_round_reached', 'bg_round_current',
  'bg_rounds_completed', 'bg_earnings', 'bg_session_seconds', 'bg_finished',
  'bg_decisions', 'bg_timing', 'bg_events_chunks', 'bg_events_count',
  'bg_events_truncated', 'bg_events_dropped_chars', 'bg_recommendation_unavailable',
  'bg_tutorial_completed', 'bg_tutorial_unavailable', 'bg_tutorial_rounds_done',
  'bg_image_load_failed'
];
// Chunk count must match MAX_EVENT_CHUNKS in the built CONFIG.
const maxChunks = Number((gameJs.match(/MAX_EVENT_CHUNKS:\s*(\d+)/) || [])[1] || 8);
for (let i = 1; i <= maxChunks; i++) OUT_FIELDS.push(`bg_events_${i}`);

const id = (p, n) => `${p}_bundlegame${n}`;
const SURVEY_ID = 'SV_bundlegame0001';

const flowChildren = [
  { Type: 'EmbeddedData', FlowID: 'FL_ed', EmbeddedData: OUT_FIELDS.map(f => ({ Description: f, Type: 'Custom', Field: f, VariableType: 'String', DataVisibility: [], AnalyzeText: false, Value: '' })) }
];
if (ARMS.length) {
  flowChildren.push({
    Type: 'BlockRandomizer', FlowID: 'FL_rand', SubSet: 1, EvenPresentation: true,
    Flow: ARMS.map((a, i) => ({
      Type: 'EmbeddedData', FlowID: `FL_arm${i}`,
      EmbeddedData: [{ Description: 'bg_ARM', Type: 'Custom', Field: 'bg_ARM', VariableType: 'String', DataVisibility: [], AnalyzeText: false, Value: a }]
    }))
  });
}
flowChildren.push({ Type: 'Block', ID: 'BL_game', FlowID: 'FL_game', Autofill: [] });

const nowStr = '2026-01-01 00:00:00';
const el = (type, primary, secondary, payload) => ({
  SurveyID: SURVEY_ID, Element: type, PrimaryAttribute: primary,
  SecondaryAttribute: secondary, TertiaryAttribute: null, Payload: payload
});

const qsf = {
  SurveyEntry: {
    SurveyID: SURVEY_ID, SurveyName: NAME, SurveyDescription: null,
    SurveyOwnerID: 'UR_bundlegame', SurveyBrandID: 'bundlegame', DivisionID: null,
    SurveyLanguage: 'EN', SurveyActiveResponseSet: 'RS_bundlegame',
    SurveyStatus: 'Inactive', SurveyStartDate: '0000-00-00 00:00:00',
    SurveyExpirationDate: '0000-00-00 00:00:00', SurveyCreationDate: nowStr,
    CreatorID: 'UR_bundlegame', LastModified: nowStr,
    LastAccessed: '0000-00-00 00:00:00', LastActivated: '0000-00-00 00:00:00', Deleted: null
  },
  SurveyElements: [
    el('BL', 'Survey Blocks', null, [{
      Type: 'Default', SurveyID: SURVEY_ID, Description: 'Game', ID: 'BL_game',
      BlockElements: [{ Type: 'Question', QuestionID: 'QID1' }]
    }]),
    el('FL', 'Survey Flow', null, { Type: 'Root', FlowID: 'FL_root', Flow: flowChildren, Properties: { Count: flowChildren.length } }),
    el('SO', 'Survey Options', null, {
      BackButton: 'false', SaveAndContinue: 'true', SurveyProtection: 'PublicSurvey',
      BallotBoxStuffingPrevention: 'false', NoIndex: 'Yes', SecureResponseFiles: 'true',
      SurveyExpiration: 'None', SurveyTermination: 'DefaultMessage', Header: '', Footer: '',
      ProgressBarDisplay: 'None', PartialData: '+1 week', ValidationMessage: '',
      PreviousButton: '', NextButton: ' → ', SurveyTitle: NAME,
      SkinLibrary: 'qualtrics', SkinType: 'templated', Skin: { brandingId: null, templateId: null, overrides: null }
    }),
    el('SCO', 'Scoring', null, { ScoringCategories: [], ScoringCategoryGroups: [], ScoringSummaryCategory: null, ScoringSummaryAfterQuestions: 0, ScoringSummaryAfterSurvey: 0, DefaultScoringCategory: null, AutoScoringCategory: null }),
    el('PROJ', 'CORE', '1.1.0', { ProjectCategory: 'CORE', SchemaVersion: '1.1.0' }),
    el('STAT', 'Survey Statistics', null, { MobileCompatible: true, ID: 'Survey Statistics' }),
    el('QC', 'Survey Question Count', null, '1'),
    el('SQ', 'QID1', 'Game', {
      QuestionText: '<div id="bundlegame-mount"></div>',
      DefaultChoices: false, DataExportTag: 'BG', QuestionID: 'QID1',
      QuestionType: 'DB', Selector: 'TB', QuestionDescription: 'BundleGame',
      Validation: { Settings: { Type: 'None' } }, GradingData: [], Language: [],
      NextChoiceId: 4, NextAnswerId: 1,
      QuestionJS: gameJs
    })
  ]
};

fs.mkdirSync(path.join(HERE, 'dist'), { recursive: true });
const qsfPath = path.join(HERE, 'dist', `${NAME.replace(/\s+/g, '_')}.qsf`);
fs.writeFileSync(qsfPath, JSON.stringify(qsf, null, 2));

const listPath = path.join(HERE, 'dist', 'embedded-data-fields.txt');
fs.writeFileSync(listPath,
  '# Create these in Survey Flow ABOVE the game block, as Embedded Data with\n' +
  '# blank values. The engine fills them in.\n\n' +
  OUT_FIELDS.join('\n') + '\n' +
  (ARMS.length ? `\n# Randomizer (evenly present 1 of these) setting bg_ARM:\n${ARMS.map(a => 'bg_ARM = ' + a).join('\n')}\n` : ''));

// offline sanity checks — the import itself cannot be verified from here
const reparsed = JSON.parse(fs.readFileSync(qsfPath, 'utf8'));
const okJs = reparsed.SurveyElements.find(e => e.PrimaryAttribute === 'QID1').Payload.QuestionJS === gameJs;
const declared = new Set(reparsed.SurveyElements.find(e => e.Element === 'FL')
  .Payload.Flow[0].EmbeddedData.map(d => d.Field));
const written = [...gameJs.matchAll(/QX\.set\('([a-z_0-9]+)'/g)].map(m => m[1]);
const missing = [...new Set(written)].filter(f => {
  if (declared.has(f)) return false;
  // chunk fields are written as 'bg_events_' + n, so the literal prefix shows up
  // in the source; it is covered by the numbered declarations.
  if (f === 'bg_events_') return ![...Array(maxChunks)].every((_, i) => declared.has('bg_events_' + (i + 1)));
  return true;
});

console.log(`  wrote ${path.relative(path.join(HERE, '..'), qsfPath)}`);
console.log(`  wrote ${path.relative(path.join(HERE, '..'), listPath)}  (${OUT_FIELDS.length} fields)`);
console.log(`  checks: valid JSON ✓   JS embedded intact ${okJs ? '✓' : '✗'}   event chunks ${maxChunks}`);
if (missing.length) {
  console.error(`  ! engine writes fields that are NOT declared: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('  checks: every field the engine writes is declared ✓');
console.log('\n  NOTE: this .qsf was generated offline and not tested through a real\n' +
  '  Qualtrics import. If it is rejected, build the survey by hand using\n' +
  '  embedded-data-fields.txt — that path is the verified one.');
