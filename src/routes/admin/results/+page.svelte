<script>
	import { onMount } from 'svelte';
	import { retrieveData, getActiveLiveSession } from '$lib/firebaseDB.js';
	import { deriveUserRunMetrics, toNumber, toMillis } from '$lib/userRunMetrics.js';

	let users = [];
	let loading = true;
	let error = null;
	let filterText = '';
	let sortField = 'completionDateMs';
	let sortAsc = false;
	let selectedUser = null;
	let dateFilter = 'all';
	let fromDate = '';
	let toDate = '';
	let includeUndated = true;
	let sessionFilter = 'all';
	let activeSessionId = '';

	function formatTime(seconds) {
		const total = Math.max(0, Math.floor(toNumber(seconds, 0)));
		const mins = Math.floor(total / 60);
		const secs = total % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDateTime(value = '') {
		const millis = toMillis(value);
		if (!millis) return 'Undated';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(millis));
	}

	function getDateInputBounds(value = '', endOfDay = false) {
		if (!value) return 0;
		const [year, month, day] = String(value).split('-').map((part) => Number(part));
		if (!year || !month || !day) return 0;
		const date = endOfDay
			? new Date(year, month - 1, day, 23, 59, 59, 999)
			: new Date(year, month - 1, day, 0, 0, 0, 0);
		return date.getTime();
	}

	function formatMoney(value = 0) {
		return `$${toNumber(value, 0).toFixed(2)}`;
	}

	function hydrateUser(user) {
		const metrics = deriveUserRunMetrics(user);
		const hasProgress = Object.keys(metrics.progress || {}).length > 0;
		const hasActionSummary = Object.keys(metrics.actionSummary?.actionsByScenarioId || {}).length > 0;
		const hasDetailedActionSummary = Object.keys(metrics.detailedActionSummary?.actionsByScenarioId || {}).length > 0;
		let auditStatus = 'partial_firebase_data';

		if (metrics.completionMeta?.finalSaveStatus === 'recovery_required') {
			auditStatus = 'recovery_required';
		} else if (metrics.completionMeta?.finalSaveStatus === 'confirmed' && hasProgress && hasActionSummary && hasDetailedActionSummary) {
			auditStatus = metrics.completionMeta?.copyVerificationMethod && metrics.completionMeta.copyVerificationMethod !== 'none'
				? 'fully_confirmed'
				: 'missing_copy_verification';
		} else if (metrics.completionMeta?.copyVerificationMethod && metrics.completionMeta.copyVerificationMethod !== 'none') {
			auditStatus = 'partial_firebase_data';
		}

		return {
			...user,
			...metrics,
			progressSummary: metrics.primarySummary,
			auditStatus
		};
	}

	function getSortableValue(user, field) {
		if (field === 'completionDateMs') return toNumber(user?.completionDateMs, 0);
		if (field === 'earnings') return toNumber(user?.earnings, 0);
		if (field === 'ordersComplete') return toNumber(user?.ordersComplete, 0);
		if (field === 'roundsCompleted') return toNumber(user?.roundsCompleted, 0);
		if (field === 'optimalChoices') return toNumber(user?.optimalChoices, 0);
		if (field === 'totalGameTime') return toNumber(user?.totalGameTime, 0);
		return String(user?.[field] ?? '').toLowerCase();
	}

	function toggleSort(field) {
		if (sortField === field) {
			sortAsc = !sortAsc;
			return;
		}
		sortField = field;
		sortAsc = field === 'completionDateMs' ? false : field === 'earnings' ? false : field === 'totalGameTime';
	}

	function setQuickSort(mode = 'newest') {
		if (mode === 'newest') {
			sortField = 'completionDateMs';
			sortAsc = false;
		} else if (mode === 'oldest') {
			sortField = 'completionDateMs';
			sortAsc = true;
		} else if (mode === 'fastest') {
			sortField = 'totalGameTime';
			sortAsc = true;
		} else if (mode === 'slowest') {
			sortField = 'totalGameTime';
			sortAsc = false;
		}
	}

	function matchesDateFilter(user) {
		if (dateFilter === 'current_session') {
			if (!activeSessionId) return false;
			return user.liveSessionId === activeSessionId;
		}

		if (!user.completionDateMs) {
			return includeUndated;
		}

		if (dateFilter === 'today') {
			const start = new Date();
			start.setHours(0, 0, 0, 0);
			return user.completionDateMs >= start.getTime();
		}

		if (dateFilter === 'last7') {
			const start = new Date();
			start.setHours(0, 0, 0, 0);
			start.setDate(start.getDate() - 6);
			return user.completionDateMs >= start.getTime();
		}

		if (dateFilter === 'custom') {
			const lowerBound = fromDate ? getDateInputBounds(fromDate, false) : 0;
			const upperBound = toDate ? getDateInputBounds(toDate, true) : 0;
			if (lowerBound && user.completionDateMs < lowerBound) return false;
			if (upperBound && user.completionDateMs > upperBound) return false;
			return true;
		}

		return true;
	}

	function normalizeExportValue(value) {
		if (value?.toDate && typeof value.toDate === 'function') {
			return value.toDate().toISOString();
		}
		if (Array.isArray(value)) {
			return JSON.stringify(value.map((item) => normalizeExportValue(item)));
		}
		if (value && typeof value === 'object') {
			return JSON.stringify(
				Object.fromEntries(
					Object.entries(value).map(([key, nested]) => [key, normalizeExportValue(nested)])
				)
			);
		}
		if (value === undefined || value === null) {
			return '';
		}
		return String(value);
	}

	function exportResults() {
		const exportKeys = Array.from(
			sortedUsers.reduce((keys, user) => {
				Object.keys(user || {}).forEach((key) => keys.add(key));
				return keys;
			}, new Set())
		).sort();

		const csv = [
			exportKeys,
			...sortedUsers.map((user) => exportKeys.map((key) => normalizeExportValue(user?.[key])))
		]
			.map((row) => row.map((cell) => `"${cell}"`).join(','))
			.join('\n');

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `results-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	onMount(async () => {
		try {
			const [rawUsers, activeSession] = await Promise.all([
				retrieveData(),
				getActiveLiveSession()
			]);
			users = rawUsers.map(hydrateUser);
			activeSessionId = String(activeSession?.sessionId ?? '').trim();
			loading = false;
		} catch (err) {
			console.error('Error loading results:', err);
			error = err.message;
			loading = false;
		}
	});

	$: sessionOptions = Array.from(
		users.reduce((map, user) => {
			if (user.liveSessionId) {
				map.set(user.liveSessionId, user.sessionLabel || user.liveSessionId);
			}
			return map;
		}, new Map())
	).sort((left, right) => left[1].localeCompare(right[1]));

	$: filteredUsers = users
		.filter((user) => {
			const query = filterText.trim().toLowerCase();
			if (!query) return true;
			return (
				String(user.id || '').toLowerCase().includes(query)
				|| String(user.displayName || '').toLowerCase().includes(query)
				|| String(user.liveSessionId || '').toLowerCase().includes(query)
			);
		})
		.filter((user) => (sessionFilter === 'all' ? true : user.liveSessionId === sessionFilter))
		.filter((user) => matchesDateFilter(user));

	$: sortedUsers = [...filteredUsers].sort((left, right) => {
		const leftValue = getSortableValue(left, sortField);
		const rightValue = getSortableValue(right, sortField);
		if (leftValue < rightValue) return sortAsc ? -1 : 1;
		if (leftValue > rightValue) return sortAsc ? 1 : -1;
		return left.displayName.localeCompare(right.displayName);
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">Experiment Results</h2>
			<p class="mt-1 text-sm text-gray-600">Latest recorded run per participant, with completion timing and live-session tags</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<button on:click={() => setQuickSort('newest')} class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Newest</button>
			<button on:click={() => setQuickSort('oldest')} class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Oldest</button>
			<button on:click={() => setQuickSort('fastest')} class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Fastest</button>
			<button on:click={() => setQuickSort('slowest')} class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Slowest</button>
			<button
				on:click={exportResults}
				class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
			>
				Export CSV
			</button>
		</div>
	</div>

	{#if loading}
		<div class="py-12 text-center text-gray-600">Loading results...</div>
	{:else if error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
			Error: {error}
		</div>
	{:else}
		<div class="grid gap-5 lg:grid-cols-4">
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="text-sm font-medium text-gray-500 truncate">Filtered Participants</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900">{sortedUsers.length}</dd>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="text-sm font-medium text-gray-500 truncate">Total Earnings</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900">
						{formatMoney(sortedUsers.reduce((sum, user) => sum + user.earnings, 0))}
					</dd>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="text-sm font-medium text-gray-500 truncate">Avg Optimal Rate</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900">
						{sortedUsers.length > 0
							? `${(sortedUsers.reduce((sum, user) => sum + user.optimalRate, 0) / sortedUsers.length).toFixed(1)}%`
							: '0.0%'}
					</dd>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="text-sm font-medium text-gray-500 truncate">Active Live Session</dt>
					<dd class="mt-1 text-lg font-semibold text-gray-900">
						{activeSessionId || 'None'}
					</dd>
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-white p-4 shadow">
			<div class="grid gap-4 lg:grid-cols-[2fr,1fr,1fr,1fr]">
				<input
					type="text"
					placeholder="Search by participant ID or session..."
					bind:value={filterText}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>

				<select bind:value={dateFilter} class="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="all">All Completion Dates</option>
					<option value="current_session">Current Class Session</option>
					<option value="today">Completed Today</option>
					<option value="last7">Completed Last 7 Days</option>
					<option value="custom">Custom Range</option>
				</select>

				<select bind:value={sessionFilter} class="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="all">All Live Sessions</option>
					{#each sessionOptions as [sessionId, sessionLabel]}
						<option value={sessionId}>{sessionLabel}</option>
					{/each}
				</select>

				<label class="flex items-center gap-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">
					<input type="checkbox" bind:checked={includeUndated} />
					Include undated rows
				</label>
			</div>

			{#if dateFilter === 'custom'}
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="results-from-date">From</label>
						<input id="results-from-date" type="date" bind:value={fromDate} class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="results-to-date">To</label>
						<input id="results-to-date" type="date" bind:value={toDate} class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
				</div>
			{/if}

			{#if dateFilter === 'current_session' && !activeSessionId}
				<p class="mt-4 text-sm text-amber-700">No active live class session is running right now, so the current-session filter has no rows to show.</p>
			{/if}
			<p class="mt-4 text-xs text-gray-500">
				Completion filters and sorting use confirmed completion timestamps only. This table prefers each participant&apos;s latest recorded run, not the highest-scoring saved version. Rows without a confirmed finish may still show a best-available activity date in the table.
			</p>
		</div>

		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('id')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('completionDateMs')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Completion {sortField === 'completionDateMs' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('earnings')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Earnings {sortField === 'earnings' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('roundsCompleted')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Rounds {sortField === 'roundsCompleted' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('optimalChoices')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Optimal {sortField === 'optimalChoices' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('totalGameTime')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Time {sortField === 'totalGameTime' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left">
								<button on:click={() => toggleSort('auditStatus')} class="text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-gray-900">
									Audit {sortField === 'auditStatus' ? (sortAsc ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each sortedUsers as user (user.id)}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{user.displayName}</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
									{#if user.completionDate}
										<div>{formatDateTime(user.completionDate)}</div>
										{#if user.completionDateSource && user.completionDateSource !== 'Final save confirmed'}
											<div class="text-xs text-gray-400">{user.completionDateSource}</div>
										{/if}
									{:else if user.bestAvailableDate}
										<div class="text-amber-700">No confirmed completion</div>
										<div class="text-xs text-gray-400">{user.bestAvailableDateSource} · {formatDateTime(user.bestAvailableDate)}</div>
									{:else}
										<div>Undated</div>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatMoney(user.earnings)}</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{user.roundsCompleted}</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
									{user.optimalChoices} ({(user.optimalRate || 0).toFixed(0)}%)
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatTime(user.totalGameTime)}</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{user.auditStatus}</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									<button on:click={() => (selectedUser = user)} class="text-blue-600 hover:text-blue-900">View</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if sortedUsers.length === 0}
				<div class="py-12 text-center text-gray-600">No participants found for the current filters.</div>
			{/if}
		</div>
	{/if}

	{#if selectedUser}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="mx-4 w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Participant: {selectedUser.displayName}</h3>

				<div class="mb-6 grid gap-3 sm:grid-cols-2">
					<div>
						<p class="block text-sm font-medium text-gray-700">Earnings</p>
						<p class="text-lg text-gray-900">{formatMoney(selectedUser.earnings)}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Completion Date</p>
						<p class="text-lg text-gray-900">{formatDateTime(selectedUser.completionDate)}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Date Source</p>
						<p class="text-lg text-gray-900">{selectedUser.completionDateSource || 'Undated'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Best Available Date</p>
						<p class="text-lg text-gray-900">{formatDateTime(selectedUser.bestAvailableDate)}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Best Date Source</p>
						<p class="text-lg text-gray-900">{selectedUser.bestAvailableDateSource || 'Undated'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Rounds Completed</p>
						<p class="text-lg text-gray-900">{selectedUser.roundsCompleted}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Optimal Choices</p>
						<p class="text-lg text-gray-900">{selectedUser.optimalChoices} ({(selectedUser.optimalRate || 0).toFixed(1)}%)</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Total Game Time</p>
						<p class="text-lg text-gray-900">{formatTime(selectedUser.totalGameTime)}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Completed Game</p>
						<p class="text-lg text-gray-900">{selectedUser.completedGame ? 'Yes' : 'No'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Audit Status</p>
						<p class="text-lg text-gray-900">{selectedUser.auditStatus}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Scenario Version</p>
						<p class="text-lg text-gray-900">{selectedUser.primaryVersionId || 'Unknown'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Live Session</p>
						<p class="text-lg text-gray-900">{selectedUser.sessionLabel || selectedUser.liveSessionId || 'None'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Last Activity</p>
						<p class="text-lg text-gray-900">{formatDateTime(selectedUser.lastActivityAt)}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Final Save Status</p>
						<p class="text-lg text-gray-900">{selectedUser.completionMeta?.finalSaveStatus || 'Unknown'}</p>
					</div>
					<div>
						<p class="block text-sm font-medium text-gray-700">Copy Verification</p>
						<p class="text-lg text-gray-900">{selectedUser.completionMeta?.copyVerificationMethod || 'none'}</p>
					</div>
					<div class="sm:col-span-2">
						<p class="block text-sm font-medium text-gray-700">Last Save Error</p>
						<p class="break-words text-sm text-gray-900">{selectedUser.completionMeta?.lastSaveError || 'None'}</p>
					</div>
				</div>

				<button
					on:click={() => (selectedUser = null)}
					class="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
				>
					Close
				</button>
			</div>
		</div>
	{/if}
</div>
