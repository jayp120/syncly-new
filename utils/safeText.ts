// src/utils/safeText.ts
export const safeText = (val: any, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
};
