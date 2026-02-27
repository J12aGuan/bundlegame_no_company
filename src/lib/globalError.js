import { writable } from 'svelte/store';

// The reactive error store
export const globalError = writable(null);

// Patch console.error (only runs once, on first import)
const originalConsoleError = console.error;

console.error = function (...args) {
  const errorMsg = args.map(String).join(" ");
  
  // Ignore non-critical AbortErrors from MapTiler and external SDKs
  if (
    errorMsg.includes('AbortError') ||
    errorMsg.includes('Fetch is aborted') ||
    errorMsg.includes('permission-denied') ||
    errorMsg.includes('Missing or insufficient permissions')
  ) {
    originalConsoleError.apply(console, args);
    return;
  }
  
  globalError.set(errorMsg);
  originalConsoleError.apply(console, args);
};
