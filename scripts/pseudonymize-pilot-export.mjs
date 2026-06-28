// Pseudonymize the local pilot export for hand-off. Reads the raw CSVs (gitignored, raw participant
// ids), replaces participant_id with a stable opaque token (p001, p002, ... assigned in sorted id
// order so a participant always maps to the same token), and writes:
//   pilot_decisions_pseudo.csv   - every analytic column, tokens only (safe to share)
//   pilot_surveys_pseudo.csv     - tokens only
//   pilot_pseudonym_map.csv      - participant_id -> token (LOCAL ONLY, gitignored, do not share)
// No Firestore access; pure local transform. Run after _run-live-export-pilot.mjs.
//   node scripts/pseudonymize-pilot-export.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
const DIR = "publishing/export_for_analysis";
const firstComma = (line) => { const i = line.indexOf(","); return i < 0 ? [line, ""] : [line.slice(0, i), line.slice(i + 1)]; };

// build a stable id -> token map from all participant ids across both files
const ids = new Set();
for (const f of ["pilot_decisions.csv", "pilot_surveys.csv"]) {
  const p = `${DIR}/${f}`; if (!existsSync(p)) continue;
  const lines = readFileSync(p, "utf8").trim().split("\n");
  for (let i = 1; i < lines.length; i += 1) { const id = firstComma(lines[i])[0]; if (id) ids.add(id); }
}
const sorted = [...ids].sort();
const token = Object.fromEntries(sorted.map((id, i) => [id, `p${String(i + 1).padStart(3, "0")}`]));
writeFileSync(`${DIR}/pilot_pseudonym_map.csv`, "participant_id,participant_token\n" + sorted.map((id) => `${id},${token[id]}`).join("\n") + "\n");

function pseudo(inFile, outFile) {
  const p = `${DIR}/${inFile}`; if (!existsSync(p)) { console.log(`skip ${inFile} (absent)`); return; }
  const lines = readFileSync(p, "utf8").trim().split("\n");
  const [head0, headRest] = firstComma(lines[0]);
  const out = [`participant_token,${headRest}`];                       // rename the id column header
  let n = 0;
  for (let i = 1; i < lines.length; i += 1) { const [id, rest] = firstComma(lines[i]); if (!id) continue; out.push(`${token[id]},${rest}`); n += 1; }
  writeFileSync(`${DIR}/${outFile}`, out.join("\n") + "\n");
  console.log(`wrote ${DIR}/${outFile}: ${n} rows, id column "${head0}" -> participant_token`);
}
pseudo("pilot_decisions.csv", "pilot_decisions_pseudo.csv");
pseudo("pilot_surveys.csv", "pilot_surveys_pseudo.csv");
console.log(`tokens: ${sorted.length} participants -> p001..p${String(sorted.length).padStart(3, "0")}; map kept LOCAL at ${DIR}/pilot_pseudonym_map.csv (gitignored).`);
