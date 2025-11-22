<script>
	import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
		<h1 class="text-3xl font-bold text-red-600 mb-4">
			{$page.status}: {$page.error?.message || 'An error occurred'}
		</h1>
		
		{#if $page.error?.stack}
			<details class="mt-4">
				<summary class="cursor-pointer text-sm font-semibold text-gray-700">
					Show error details
				</summary>
				<pre class="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">{$page.error.stack}</pre>
			</details>
		{/if}

		<a 
			href="/" 
			class="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
		>
			Go Home
		</a>
	</div>
</div>
