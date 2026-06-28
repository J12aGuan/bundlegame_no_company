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
import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "fs";
import net from "net";
import { generateAuthToken } from "../src/lib/authToken.js";

const isWin = process.platform === "win32";
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
    if (existsSync(BAK)) renameSync(BAK, ENVL);
    else if (createdFresh && existsSync(ENVL)) unlinkSync(ENVL);
  } catch {}
}

const children = [];
function killTree(pid) {
  if (!pid) return;
  if (isWin) { try { spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
  else { try { process.kill(pid, "SIGTERM"); } catch {} }
}
let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) killTree(c.pid);
  restoreEnv();
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("exit", restoreEnv);

const waitForPort = (port, ms = 60000) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  const tick = () => {
    const s = net.connect(port, "127.0.0.1");
    s.once("connect", () => { s.destroy(); resolve(); });
    s.once("error", () => { s.destroy(); Date.now() - t0 > ms ? reject(new Error("emulator did not start on " + port)) : setTimeout(tick, 500); });
  };
  tick();
});

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

// 3. start the emulator, wait for it, seed, then run the dev server.
console.log("[1/3] starting Firestore + Auth emulator ...");
const emu = spawn("npx", ["-y", "firebase-tools", "emulators:start", "--only", "firestore,auth", "--config", "firebase.emulator.json", "--project", "demo-bundlegame"], { stdio: ["ignore", "inherit", "inherit"], shell: true });
children.push(emu);
emu.on("exit", (code) => { if (!shuttingDown) { console.error(`emulator exited (code ${code}). If port 8080 is busy, close the other emulator and retry.`); shutdown(code ?? 1); } });

try { await waitForPort(8080); } catch (e) { console.error(e.message); shutdown(1); }

console.log("\n[2/3] seeding both phases ...");
const seed = spawnSync("node", ["scripts/seed-emulator-paired.mjs"], { stdio: "inherit", shell: true });
if (seed.status !== 0) { console.error("seeding failed."); shutdown(1); }

console.log("\n[3/3] starting the dev app (emulator mode). Open the Local URL below and log in.\n");
const dev = spawn("npm", ["run", "dev"], { stdio: ["ignore", "inherit", "inherit"], shell: true });
children.push(dev);
dev.on("exit", (code) => shutdown(code ?? 0));
