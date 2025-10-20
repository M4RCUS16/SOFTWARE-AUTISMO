export function extractArray(payload, fallback = []) {
  if (!payload) {
    return fallback;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (typeof payload === "object") {
    const values = Object.values(payload).filter(Array.isArray);
    if (values.length) {
      return values[0];
    }
  }
  return fallback;
}

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
