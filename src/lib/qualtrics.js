const FIELD_ALIASES = {
	response_id: ['ResponseId', 'ResponseID', 'Response ID', 'responseId', 'response_id'],
	recorded_at: ['RecordedDate', 'Recorded Date', 'recordedDate', 'recorded_at', 'EndDate', 'End Date'],
	started_at: ['StartDate', 'Start Date', 'started_at'],
	finished: ['Finished', 'finished'],
	progress: ['Progress', 'progress'],
	duration_seconds: ['Duration (in seconds)', 'Duration', 'duration', 'duration_seconds'],
	bundle_game_user_id: ['bundleGameUserId', 'Bundle Game User ID', 'bundle_game_user_id', 'userId', 'User ID'],
	bundle_game_result_code: ['bundleGameResultCode', 'Bundle Game Result Code', 'bundle_game_result_code', 'resultCode', 'Result Code'],
	bundle_game_save_status: ['bundleGameSaveStatus', 'Bundle Game Save Status', 'bundle_game_save_status', 'saveStatus', 'Save Status'],
	student_name: ['name', 'Name', 'studentName', 'Student Name', 'RecipientFirstName', 'Recipient First Name'],
	finished_id: ['finishedid', 'finishedId', 'Finished ID', 'finished_id']
};

function normalizeFieldName(value = '') {
	return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCell(value) {
	return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function getFieldValue(row = {}, aliases = []) {
	let fallback = '';
	for (const alias of aliases) {
		if (Object.prototype.hasOwnProperty.call(row, alias)) {
			const value = normalizeCell(row[alias]);
			if (value) return value;
			fallback = fallback || value;
		}
	}
	const normalizedAliases = new Set(aliases.map(normalizeFieldName));
	for (const [key, value] of Object.entries(row || {})) {
		if (normalizedAliases.has(normalizeFieldName(key))) {
			const normalized = normalizeCell(value);
			if (normalized) return normalized;
			fallback = fallback || normalized;
		}
	}
	return fallback;
}

function toBoolean(value, fallback = true) {
	const normalized = normalizeCell(value).toLowerCase();
	if (!normalized) return fallback;
	if (['true', '1', 'yes', 'y', 'finished', 'complete', 'completed'].includes(normalized)) return true;
	if (['false', '0', 'no', 'n', 'incomplete', 'partial'].includes(normalized)) return false;
	return fallback;
}

function toNumberOrNull(value) {
	const numeric = Number(normalizeCell(value));
	return Number.isFinite(numeric) ? numeric : null;
}

function normalizeIsoDate(value = '') {
	const normalized = normalizeCell(value);
	if (!normalized) return '';
	const millis = Date.parse(normalized);
	return Number.isFinite(millis) ? new Date(millis).toISOString() : normalized;
}

export function parseBundleGameResultCode(resultCode = '') {
	let normalized = normalizeCell(resultCode);
	if (!normalized) return { userId: '', key: '' };
	try {
		if (/^https?:\/\//i.test(normalized)) {
			normalized = new URL(normalized).search.slice(1);
		} else if (normalized.includes('?')) {
			normalized = normalized.slice(normalized.indexOf('?') + 1);
		}
		const params = new URLSearchParams(normalized);
		return {
			userId: normalizeCell(params.get('userId')),
			key: normalizeCell(params.get('key'))
		};
	} catch (_error) {
		return { userId: '', key: '' };
	}
}

export function buildQualtricsMatchKey(userId = '', resultAccessKey = '') {
	const normalizedUserId = normalizeCell(userId);
	const normalizedKey = normalizeCell(resultAccessKey);
	return normalizedUserId && normalizedKey ? `${normalizedUserId}::${normalizedKey}` : '';
}

export function buildQualtricsUserKey(userId = '') {
	return normalizeCell(userId).toLowerCase();
}

export function parseCsvRows(text = '') {
	const input = String(text ?? '').replace(/^\uFEFF/, '');
	const rows = [];
	let row = [];
	let cell = '';
	let quoted = false;

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const next = input[index + 1];
		if (quoted) {
			if (char === '"' && next === '"') {
				cell += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				cell += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(cell);
			cell = '';
		} else if (char === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else if (char !== '\r') {
			cell += char;
		}
	}
	if (cell || row.length > 0 || input.endsWith(',')) {
		row.push(cell);
		rows.push(row);
	}
	return rows.filter((entry) => entry.some((value) => normalizeCell(value)));
}

export function parseCsvObjects(text = '') {
	const rows = parseCsvRows(text);
	if (rows.length === 0) return [];
	const headers = rows[0].map((header, index) => normalizeCell(header) || `field_${index + 1}`);
	return rows.slice(1).map((row) => Object.fromEntries(
		headers.map((header, index) => [header, row[index] ?? ''])
	));
}

function hashString(value = '') {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
}

export function rowLooksLikeQualtricsHeader(row = {}) {
	const responseId = getFieldValue(row, FIELD_ALIASES.response_id).toLowerCase();
	const finished = getFieldValue(row, FIELD_ALIASES.finished).toLowerCase();
	const values = Object.values(row || {}).map((value) => normalizeCell(value));
	return (
		['response id', 'responseid', 'response_id', 'import id'].includes(responseId)
		|| ['finished', 'import id'].includes(finished)
		|| values.some((value) => /^\{"ImportId":/i.test(value))
	);
}

export function normalizeQualtricsResponseRow(row = {}, options = {}) {
	const resultCode = getFieldValue(row, FIELD_ALIASES.bundle_game_result_code);
	const parsedCode = parseBundleGameResultCode(resultCode);
	const embeddedUserId = getFieldValue(row, FIELD_ALIASES.bundle_game_user_id);
	const userId = embeddedUserId || parsedCode.userId;
	const resultAccessKey = parsedCode.key;
	const responseId = getFieldValue(row, FIELD_ALIASES.response_id);
	const recordedAt = normalizeIsoDate(getFieldValue(row, FIELD_ALIASES.recorded_at));
	const startedAt = normalizeIsoDate(getFieldValue(row, FIELD_ALIASES.started_at));
	const importedAt = normalizeIsoDate(options.importedAt || new Date().toISOString());
	const finished = toBoolean(getFieldValue(row, FIELD_ALIASES.finished), true);
	const matchKey = buildQualtricsMatchKey(userId, resultAccessKey);
	const fallbackId = `qualtrics_${hashString(JSON.stringify(row))}`;
	const id = normalizeCell(responseId || fallbackId).replace(/[/.#[\]]/g, '_');
	const userKey = buildQualtricsUserKey(userId);

	return {
		id,
		response_id: responseId || id,
		survey_id: normalizeCell(options.surveyId),
		user_id: userId,
		user_key: userKey,
		student_name: getFieldValue(row, FIELD_ALIASES.student_name),
		finished_id: getFieldValue(row, FIELD_ALIASES.finished_id),
		result_code: resultCode,
		result_access_key: resultAccessKey,
		match_key: matchKey,
		save_status: getFieldValue(row, FIELD_ALIASES.bundle_game_save_status),
		finished,
		progress: toNumberOrNull(getFieldValue(row, FIELD_ALIASES.progress)),
		duration_seconds: toNumberOrNull(getFieldValue(row, FIELD_ALIASES.duration_seconds)),
		recorded_at: recordedAt,
		started_at: startedAt,
		imported_at: importedAt,
		source: normalizeCell(options.source) || 'qualtrics',
		match_status: matchKey && finished ? 'result_code_ready' : (userKey && finished ? 'user_id_ready' : 'missing_game_identifiers'),
		raw_fields: row && typeof row === 'object' ? { ...row } : {}
	};
}

export function normalizeQualtricsResponseDocument(docId = '', data = {}) {
	const source = data && typeof data === 'object' ? data : {};
	const rawFields = source.raw_fields || source;
	const metadataRow = rowLooksLikeQualtricsHeader(rawFields);
	const normalized = normalizeQualtricsResponseRow(rawFields, {
		surveyId: source.survey_id,
		importedAt: source.imported_at,
		source: source.source
	});
	return {
		...normalized,
		...source,
		id: normalizeCell(source.id || docId || normalized.id),
		response_id: normalizeCell(source.response_id || normalized.response_id),
		user_id: metadataRow ? '' : normalizeCell(source.user_id || normalized.user_id),
		user_key: metadataRow ? '' : normalizeCell(source.user_key || normalized.user_key),
		student_name: normalizeCell(source.student_name || normalized.student_name),
		finished_id: normalizeCell(source.finished_id || normalized.finished_id),
		result_access_key: metadataRow ? '' : normalizeCell(source.result_access_key || normalized.result_access_key),
		match_key: metadataRow ? '' : normalizeCell(source.match_key || normalized.match_key),
		finished: metadataRow ? false : (source.finished !== undefined ? Boolean(source.finished) : normalized.finished),
		match_status: metadataRow ? 'metadata_row' : normalizeCell(source.match_status || normalized.match_status)
	};
}

export function normalizeQualtricsResponsesFromCsv(csvText = '', options = {}) {
	const importedAt = normalizeIsoDate(options.importedAt || new Date().toISOString());
	const rows = parseCsvObjects(csvText)
		.filter((row) => !rowLooksLikeQualtricsHeader(row))
		.map((row) => normalizeQualtricsResponseRow(row, {
			...options,
			importedAt,
			source: options.source || 'qualtrics_csv'
	}));
	const completed = rows.filter((row) => row.finished !== false);
	const matchReady = completed.filter((row) => row.match_key || row.user_key);
	return {
		importedAt,
		rows,
		completed,
		matchReady,
		unmatched: completed.filter((row) => !(row.match_key || row.user_key))
	};
}
