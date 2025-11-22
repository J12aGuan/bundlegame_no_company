import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Using Vercel adapter for deployment to Vercel platform
		// Specify Node.js 20 runtime explicitly
		adapter: adapter({
			runtime: 'nodejs20.x'
		})
	}
};

export default config;
