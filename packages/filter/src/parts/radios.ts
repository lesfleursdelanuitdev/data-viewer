// Arrow keys in a group of single-choice check rows (role="radio" inside role="radiogroup"), as
// radio buttons do: Up/Left and Down/Right (wrapping), Home and End move to a row and pick it.
// A row already picked is not ticked again, since a tick on it unpicks it. When an option search
// sits above the group (a long list in a menu), Up from the first row goes back to it, picking
// nothing, instead of wrapping. No DOM until called.

/** The radiogroup's keydown handler: moves focus to the next radio and picks it. */
export function radioKeys(e: KeyboardEvent): void {
  const group = e.currentTarget as HTMLElement;
  const all = [...group.querySelectorAll<HTMLElement>('[role=radio]')];
  const at = all.indexOf(document.activeElement as HTMLElement);
  const search = at === 0 && e.key === 'ArrowUp' ? group.parentElement?.querySelector<HTMLElement>(':scope > input[type=search]') : null;
  if (search) {
    e.preventDefault();
    search.focus();
    return;
  }
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
  const to = at < 0 ? -1 : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1
    : step !== undefined ? (at + step + all.length) % all.length : -1;
  if (to < 0) return;
  e.preventDefault();
  const row = all[to]!;
  row.focus();
  if (row.getAttribute('aria-checked') !== 'true') row.click();
}

/** The one row of a radiogroup in the tab order: the picked one, else the first. */
export const tabStop = (on: boolean[], i: number): number => (on[i] || (i === 0 && !on.includes(true)) ? 0 : -1);
