/** How long a draft must stay unchanged before the server is asked for its count (D3). */
export const COUNT_DEBOUNCE_MS = 300;

/**
 * Server mode's count for an open filter draft. ask() forgets the last count and asks again
 * once the draft has stayed the same for COUNT_DEBOUNCE_MS, cancelling any older request; only
 * the latest request's answer is kept. A failure, a cancel or no number leaves `value` null.
 */
export class DraftCount {
  value: number | null = null;
  private _timer: ReturnType<typeof setTimeout> | undefined;
  private _ctrl: AbortController | undefined;
  private readonly _changed: () => void;

  /** `changed` runs when a count arrives. */
  constructor(changed: () => void) {
    this._changed = changed;
  }

  ask(count: (signal: AbortSignal) => Promise<number | null | undefined>): void {
    this.stop();
    this._timer = setTimeout(() => {
      const ctrl = (this._ctrl = new AbortController());
      Promise.resolve()
        .then(() => count(ctrl.signal))
        .then((n) => {
          if (this._ctrl !== ctrl) return; // cancelled or overtaken
          this._ctrl = undefined;
          this.value = typeof n === 'number' && Number.isFinite(n) ? n : null;
          this._changed();
        })
        .catch(() => {
          if (this._ctrl === ctrl) this._ctrl = undefined;
        });
    }, COUNT_DEBOUNCE_MS);
  }

  /** Cancels the waiting or running request and forgets the count. */
  stop(): void {
    clearTimeout(this._timer);
    this._ctrl?.abort();
    this._ctrl = undefined;
    this.value = null;
  }
}
