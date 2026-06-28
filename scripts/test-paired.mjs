/**
 * ONE-COMMAND local test of the paired pilot->aided game. Starts the Firestore+Auth emulator, seeds
 * both phases, runs the dev app pointed at the emulator, and prints the login. Nothing touches
 * production. Ctrl+C stops everything and restores your env.
 *
 *   npm run test:paired
 *
 * Then open the printed URL and log in as the printed id/token. Use a `test-*` id so the game plays
 * INSTANTLY (no picking/delivery wait). Look for: boots to pilot Round 1/27 (unaided) -> after 27
 * auto-advances to the aided 35-round set under the SAME id -> directed-teaching feedback only on
 * aided rounds 16-20 and 26-30.
 */
import { spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { generateAuthToken } from "../src/lib/authToken.js";

const ENVL = ".env.local";
const BAK = ".env.local.testbak";
let createdFresh = false;

// 1. ensure .env.local exposes the emulator hook to vite (preserve any existing file).
const vars = "VITE_USE_FIREBASE_EMULATOR=true\nVITE_FIREBASE_PROJECT_ID=demo-bundlegame\n";
if (existsSync(ENVL)) {
  if (!existsSync(BAK)) renameSync(ENVL, BAK);
  writeFileSync(ENVL, readFileSync(BAK, "utf8").replace(/\s*$/, "\n") + vars);
} else {
  createdFresh = true;
  writeFileSync(ENVL, vars);
}
function restoreEnv() {
  try {
    if (existsSync(BAK)) { renameSync(BAK, ENVL); }
    else if (createdFresh && existsSync(ENVL)) { unlinkSync(ENVL); }
  } catch {}
}
process.on("exit", restoreEnv);

// 2. print the login up front.
const ID = "test-1";
const bar = "=".repeat(64);
console.log(`\n${bar}\n  PAIRED GAME TEST — launching emulator + seed + dev (one command)\n${bar}`);
console.log(`  When you see "Local:  http://localhost:5173/", open it and log in:`);
console.log(`      User ID:  ${ID}`);
console.log(`      Token:    ${generateAuthToken(ID)}`);
console.log(`  (a test-* id plays INSTANTLY — no picking/delivery wait)\n`);
console.log(`  Expect: pilot Round 1/27 (unaided) -> auto-advance to aided 35-round set under the`);
console.log(`  same id -> directed-teaching feedback only on aided rounds 16-20 & 26-30.`);
console.log(`  Ctrl+C stops everything and restores your env.\n${bar}\n`);

// 3. one managed process: firebase-tools brings up the emulator, runs (seed && dev), and tears the
//    emulator down when dev exits (Ctrl+C). No extra terminals.
const inner = "node scripts/seed-emulator-paired.mjs && npm run dev";
const child = spawn(
  "npx",
  ["-y", "firebase-tools", "emulators:exec", "--only", "firestore,auth", "--config", "firebase.emulator.json", "--project", "demo-bundlegame", inner],
  { stdio: "inherit", shell: true },
);
child.on("exit", (code) => process.exit(code ?? 0));
