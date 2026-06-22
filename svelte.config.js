import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// SPA fallback so client-side routes resolve on static hosting (Vercel). Prerendered
		// routes still emit their own HTML; any unmatched path is served 200.html, which boots
		// the app and lets the client router resolve the route.
		adapter: adapter({ fallback: '200.html' }),
		prerender: {
			entries: ['*']   // Force prerender ALL routes to generate HTML
		}
	}
};

export default config;