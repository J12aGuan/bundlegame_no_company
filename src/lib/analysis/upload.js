function parseCsvText(text = "") {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  function pushCell() {
    currentRow.push(currentCell);
    currentCell = "";
  }

  function pushRow() {
    if (currentRow.length === 0 && !currentCell) return;
    pushCell();
    rows.push(currentRow);
    currentRow = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // Skip CR in CRLF files.
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    pushRow();
  }

  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) =>
      Object.fromEntries(
        header.map((column, index) => [
          String(column || "").trim(),
          row[index] ?? "",
        ]),
      ),
    );
}

function normalizeObjectRows(raw, label = "payload") {
  if (Array.isArray(raw)) {
    return raw.filter(
      (row) => row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (raw && typeof raw === "object") {
    for (const key of ["rows", "participants", "data"]) {
      if (Array.isArray(raw[key])) {
        return raw[key].filter(
          (row) => row && typeof row === "object" && !Array.isArray(row),
        );
      }
    }
  }
  throw new Error(`Unsupported ${label} schema.`);
}

function isLegacyTranscriptPayload(raw) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "event" in entry &&
        "time" in entry,
    );
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.Data)) {
    return raw.Data.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "event" in entry &&
        "time" in entry,
    );
  }
  return false;
}

export async function parseUploadedAnalysisSource({
  participantsFile = null,
  scenarioBundleFile = null,
  storesFile = null,
  citiesFile = null,
  metadataFile = null,
} = {}) {
  if (!participantsFile) {
    throw new Error("Participant JSON is required for upload mode.");
  }

  const participantsRaw = JSON.parse(await participantsFile.text());
  if (isLegacyTranscriptPayload(participantsRaw)) {
    throw new Error(
      "Transcript-style time/event logs are not supported here. Upload the structured participant export JSON instead.",
    );
  }

  let participants = [];
  let embeddedScenarioBundle = null;

  if (Array.isArray(participantsRaw)) {
    participants = participantsRaw;
  } else if (participantsRaw && typeof participantsRaw === "object") {
    if (Array.isArray(participantsRaw.participants)) {
      participants = participantsRaw.participants;
    } else if (
      Array.isArray(participantsRaw.Data) &&
      isLegacyTranscriptPayload(participantsRaw)
    ) {
      throw new Error(
        "Transcript-style time/event logs are not supported here. Upload the structured participant export JSON instead.",
      );
    } else {
      throw new Error(
        "Unsupported participant upload schema. Use the structured downloader export JSON.",
      );
    }
    if (
      participantsRaw.scenario_bundle &&
      typeof participantsRaw.scenario_bundle === "object"
    ) {
      embeddedScenarioBundle = participantsRaw.scenario_bundle;
    }
  } else {
    throw new Error(
      "Unsupported participant upload schema. Use the structured downloader export JSON.",
    );
  }

  const scenarioBundle = scenarioBundleFile
    ? JSON.parse(await scenarioBundleFile.text())
    : embeddedScenarioBundle;

  if (!scenarioBundle || typeof scenarioBundle !== "object") {
    throw new Error(
      "Scenario bundle JSON is required unless it is embedded in the participant upload.",
    );
  }

  const storesDataset = storesFile ? JSON.parse(await storesFile.text()) : {};
  const citiesDataset = citiesFile ? JSON.parse(await citiesFile.text()) : {};

  let metadataRows = [];
  if (metadataFile) {
    if (metadataFile.name.toLowerCase().endsWith(".csv")) {
      metadataRows = parseCsvText(await metadataFile.text());
    } else {
      const metadataRaw = JSON.parse(await metadataFile.text());
      metadataRows = normalizeObjectRows(metadataRaw, "metadata");
    }
  }

  return {
    participants,
    scenarioBundle,
    storesDataset,
    citiesDataset,
    metadataRows,
  };
}
