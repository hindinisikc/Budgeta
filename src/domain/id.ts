/**
 * Random id. Uses crypto.getRandomValues because crypto.randomUUID is only available on
 * HTTPS/localhost, and the app may be opened over plain HTTP on the local network while testing.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function nowIso(): string {
  return new Date().toISOString();
}
