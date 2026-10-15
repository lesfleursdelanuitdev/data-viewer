// What the json and pammy adapters share: build the address, ask, and read the answer.

// src with the given parameters added; src's own parameters stay. Relative to the page.
export function withParams(src: string, params: Record<string, string>): string {
  const url = new URL(src, globalThis.location?.href ?? 'http://localhost/');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.href;
}

// GETs JSON with the page's own cookies (a signed-in visitor), and throws on any non-2xx.
export async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // An API's own reason, when it gives one, helps whoever reads the console.
    let reason = '';
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body?.message === 'string') reason = `${body.message} `;
    } catch {
      // no JSON body: the status says enough
    }
    throw new Error(`Couldn't load ${url}: ${reason}${res.status}`);
  }
  return res.json();
}
