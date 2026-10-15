/**
 * Waits for quiet: run() starts (or restarts) the wait, and `fn` runs `ms` after the last run().
 * flush() runs it at once (dropping the wait), cancel() drops the wait. A delay that isn't a
 * number of 0 or more counts as 0, which still waits for the next turn.
 */
export function debounce(fn: () => void, ms: number): { run(): void; flush(): void; cancel(): void } {
  const wait = Number.isFinite(ms) && ms > 0 ? ms : 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    run() {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        fn();
      }, wait);
    },
    flush() {
      cancel();
      fn();
    },
    cancel,
  };
}
