import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Ensure @sveltejs/kit is bundled, not externalized
			external: [],
			isr: {
				expiration: false
			}
		})
	}
};

export default config;