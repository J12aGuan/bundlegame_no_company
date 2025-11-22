

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.Biix1-qE.js","_app/immutable/chunks/BwVgRXCD.js","_app/immutable/chunks/DII1jsM6.js"];
export const stylesheets = [];
export const fonts = [];
