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
		client: {start:"_app/immutable/entry/start.BFYvBQqS.js",app:"_app/immutable/entry/app.CusZ7lDV.js",imports:["_app/immutable/entry/start.BFYvBQqS.js","_app/immutable/chunks/DFohlXUt.js","_app/immutable/chunks/DII1jsM6.js","_app/immutable/chunks/Bl_Gtloo.js","_app/immutable/chunks/B520pLVj.js","_app/immutable/entry/app.CusZ7lDV.js","_app/immutable/chunks/BZsfmjOD.js","_app/immutable/chunks/DII1jsM6.js","_app/immutable/chunks/BL-k6yB1.js","_app/immutable/chunks/BXaE6gdj.js","_app/immutable/chunks/BwVgRXCD.js","_app/immutable/chunks/BOprRm-S.js","_app/immutable/chunks/Bl_Gtloo.js","_app/immutable/chunks/B520pLVj.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js'))
		],
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
