const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

// Only web, mail and phone links. The string is parsed the way the browser will parse it
// (it strips tabs, newlines and leading control characters), so "java\tscript:" can't slip by.
// Relative links resolve to the page's own scheme and still pass.
export function safeUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  try {
    const url = new URL(v, document.baseURI);
    return SAFE_SCHEMES.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
