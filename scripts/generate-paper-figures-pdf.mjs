import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Thin wrapper around publishing/paper_artifacts/figures_pdf.py (the camera-ready
// vector-PDF companion to generate.py). With no args it renders the bundled
// fixtures; any args (e.g. --analysis-dir ...) are passed through and suppress the
// fixture defaults. Mirrors scripts/generate-paper-artifacts.mjs.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const python = process.env.PYTHON || "python3";
const scriptPath = path.join(repoRoot, "publishing", "paper_artifacts", "figures_pdf.py");

const passthrough = process.argv.slice(2);
const fixtureDefaults = passthrough.some((a) => a === "--analysis-dir")
  ? []
  : [
      "--analysis-dir", "publishing/paper_artifacts/fixtures/analysis",
      "--publication-dir", "publishing/paper_artifacts/fixtures/publication_export",
      "--out-dir", "publishing/paper_artifacts/out/figures_pdf",
    ];

const result = spawnSync(python, [scriptPath, ...fixtureDefaults, ...passthrough], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 0;
}
