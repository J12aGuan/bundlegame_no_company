<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { reportSilentError } from '$lib/globalError.js';

	onMount(() => {
		reportSilentError('route.error', $page.status, $page.error?.message || 'Unknown route error', $page.error?.stack || '');
		const redirectTimer = setTimeout(() => {
			if (typeof window !== 'undefined') {
				window.location.replace('/');
			}
		}, 150);
		return () => clearTimeout(redirectTimer);
	});
</script>

<div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
	<div class="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-lg">
		<p class="text-sm font-medium text-slate-500">Reconnecting session...</p>
	</div>
</div>
