/**
 * Small utility helpers for reading environment variables in both browser (import.meta.env)
 * and server (process.env) contexts. This allows us to declare a config value once and have
 * it respected everywhere without requiring users to re-enter the same key in localStorage.
 */

const readImportMetaEnv = (key: string): string | null => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      const raw = (import.meta as any).env[key];
      if (typeof raw === 'string') {
        return raw;
      }
    }
  } catch {
    // import.meta not available (e.g., during SSR or tests)
  }
  return null;
};

const readProcessEnv = (key: string): string | null => {
  if (typeof process === 'undefined') {
    return null;
  }

  const value = (process as any)?.env?.[key];
  return typeof value === 'string' ? value : null;
};

const normalize = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Returns the first non-empty env value that matches one of the supplied keys.
 * Keys are checked against import.meta.env first and then process.env, which
 * keeps behavior consistent between Vite dev server, production builds, and
 * Firebase Functions.
 */
export const getEnvString = (...keys: string[]): string | null => {
  for (const key of keys) {
    const fromImportMeta = normalize(readImportMetaEnv(key));
    if (fromImportMeta) {
      return fromImportMeta;
    }

    const fromProcess = normalize(readProcessEnv(key));
    if (fromProcess) {
      return fromProcess;
    }
  }

  return null;
};
