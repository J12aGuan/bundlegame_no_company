import { writable } from 'svelte/store';

// The reactive error store
export const globalError = writable(null);

// Patch console.error (only runs once, on first import)
const originalConsoleError = console.error;

console.error = function (...args) {
  const errorMsg = args.map(String).join(" ");
  const lowered = errorMsg.toLowerCase();
  
  // Ignore non-critical AbortErrors from MapTiler and external SDKs
  if (
    errorMsg.includes('AbortError') ||
    errorMsg.includes('Fetch is aborted') ||
    errorMsg.includes('permission-denied') ||
    errorMsg.includes('Missing or insufficient permissions') ||
    lowered.includes('style is not done loading') ||
    lowered.includes('code=unavailable') ||
    lowered.includes('client is offline')
  ) {
    // Ensure transient map/network issues do not leave the UI stuck in global error state.
    if (
      lowered.includes('style is not done loading') ||
      lowered.includes('code=unavailable') ||
      lowered.includes('client is offline')
    ) {
      globalError.set(null);
    }
    originalConsoleError.apply(console, args);
    return;
  }
  
  globalError.set(errorMsg);
  originalConsoleError.apply(console, args);
};
