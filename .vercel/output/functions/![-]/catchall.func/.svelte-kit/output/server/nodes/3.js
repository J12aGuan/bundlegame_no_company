

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/downloader/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.CQ9wS1QZ.js","_app/immutable/chunks/B3TvFCtC.js","_app/immutable/chunks/Cao0yY2J.js","_app/immutable/chunks/C4K_aaoz.js","_app/immutable/chunks/B7PLFFmE.js","_app/immutable/chunks/DjcyRQET.js","_app/immutable/chunks/BEyWgUWM.js","_app/immutable/chunks/Ir3_mycn.js"];
export const stylesheets = ["_app/immutable/assets/app.DJBXz11s.css"];
export const fonts = [];
