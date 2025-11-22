

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true,
  "prerender": false
};
export const universal_id = "src/routes/+layout.js";
export const imports = ["_app/immutable/nodes/0.4hIAaR0m.js","_app/immutable/chunks/D5rBIzQ3.js","_app/immutable/chunks/B7QV2wpA.js"];
export const stylesheets = [];
export const fonts = [];
