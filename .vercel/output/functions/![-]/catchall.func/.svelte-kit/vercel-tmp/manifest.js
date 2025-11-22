export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","images/apple.jpg","images/banana.jpg","images/cabbage.jpg","images/coconut.jpg","images/colorful-simple-fruit-drawing-perfect-for-children-s-illustration-and-teaching-vector copy 4.jpg","images/crossing.jpg","images/dill.jpg","images/green.jpg","images/lychee.jpg","images/muscadine.jpg","images/paracress.jpg","images/pineapple.jpg","images/pngtree-simple-fruit-set-design-png-image_4947340.jpeg","images/red.jpg","images/stop.jpg","images/yellow.jpg","images/yield.jpg"]),
	mimeTypes: {".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg"},
	_: {
		client: {start:"_app/immutable/entry/start.EI5aFa7k.js",app:"_app/immutable/entry/app.Sg5-D2t-.js",imports:["_app/immutable/entry/start.EI5aFa7k.js","_app/immutable/chunks/CdLCgszW.js","_app/immutable/chunks/B7QV2wpA.js","_app/immutable/chunks/t1Fq6yS9.js","_app/immutable/chunks/DSQSpq2r.js","_app/immutable/entry/app.Sg5-D2t-.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/B7QV2wpA.js","_app/immutable/chunks/Bz8mzjtx.js","_app/immutable/chunks/CmTuCmZK.js","_app/immutable/chunks/D5rBIzQ3.js","_app/immutable/chunks/t1Fq6yS9.js","_app/immutable/chunks/DSQSpq2r.js","_app/immutable/chunks/CLmjqrK_.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/downloader",
				pattern: /^\/downloader\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/tutorial",
				pattern: /^\/tutorial\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
