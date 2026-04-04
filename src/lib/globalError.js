import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export const globalError = writable(null);
export const silentErrorLog = writable([]);

const MAX_SILENT_ERRORS = 100;
const STORAGE_KEY = 'bundlegame:silentErrors';
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function stringifyErrorPart(value) {
  if (value instanceof Error) {
    return value.stack || value.message || String(value);
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function shouldIgnoreVisibleEscalation(message = '') {
  const lowered = String(message || '').toLowerCase();
  return (
    lowered.includes('aborterror') ||
    lowered.includes('fetch is aborted') ||
    lowered.includes('permission-denied') ||
    lowered.includes('missing or insufficient permissions') ||
    (lowered.includes('notallowederror') && lowered.includes('clipboard')) ||
    (lowered.includes('writetext') && lowered.includes('clipboard')) ||
    lowered.includes('permissions policy applied to the current document') ||
    lowered.includes('style is not done loading') ||
    (lowered.includes('sourcecaches') && lowered.includes('cleartiles')) ||
    lowered.includes('code=unavailable') ||
    lowered.includes('client is offline')
  );
}

function persistSilentErrors(entries) {
  if (!browser || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_error) {
    // Ignore storage failures. Silent logging must never affect gameplay.
  }
}

export function reportSilentError(source = 'runtime', ...args) {
  const details = args.map((arg) => stringifyErrorPart(arg)).filter(Boolean);
  const summary = details.join(' ').trim() || String(source || 'runtime_error');
  const normalizedSource = String(source || 'runtime').trim() || 'runtime';
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    source: normalizedSource,
    summary,
    ignoredForUi: shouldIgnoreVisibleEscalation(summary)
  };

  silentErrorLog.update((value) => {
    const next = [...(Array.isArray(value) ? value : []), entry].slice(-MAX_SILENT_ERRORS);
    persistSilentErrors(next);
    return next;
  });

  globalError.set(null);
  return entry;
}

if (!globalThis.__bundlegameSilentErrorHooksInstalled) {
  globalThis.__bundlegameSilentErrorHooksInstalled = true;

  console.error = function (...args) {
    reportSilentError('console.error', ...args);
    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args) {
    reportSilentError('console.warn', ...args);
    originalConsoleWarn.apply(console, args);
  };

  if (browser && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      reportSilentError('window.error', event?.error || event?.message || 'Unknown window error');
      event?.preventDefault?.();
    });

    window.addEventListener('unhandledrejection', (event) => {
      reportSilentError('window.unhandledrejection', event?.reason || 'Unknown promise rejection');
      event?.preventDefault?.();
    });
  }
}
