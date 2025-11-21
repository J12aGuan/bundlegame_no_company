import { writable } from 'svelte/store';

// The reactive error store
export const globalError = writable(null);

// Patch console.error (only runs once, on first import)
const originalConsoleError = console.error;

console.error = function (...args) {
  globalError.set(args.map(String).join(" "));
  originalConsoleError.apply(console, args);
};