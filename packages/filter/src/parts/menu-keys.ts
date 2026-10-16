// The arrow keys of a menu of check rows (the bar's pill menus, the columns' header menus).

/**
 * A menu's keydown handler: Up, Down, Home and End move between its check rows; Down from the
 * search box (or from the menu itself, just opened) goes to the first row, or to a radiogroup's
 * tab stop; Up from the first row goes back to the search box. Keys a radiogroup inside has
 * already handled (it moves and picks) are left alone.
 */
export function menuKeys(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  const menu = e.currentTarget as HTMLElement;
  const rows = [...menu.querySelectorAll<HTMLElement>('.lfdln-filter-check-row')];
  const at = rows.indexOf(menu.ownerDocument.activeElement as HTMLElement);
  const search = menu.querySelector<HTMLElement>('input[type=search]');
  let to: HTMLElement | null | undefined;
  if (e.key === 'ArrowDown') to = at < 0 ? rows.find((r) => r.getAttribute('tabindex') === '0') ?? rows[0] : rows[Math.min(at + 1, rows.length - 1)];
  else if (e.key === 'ArrowUp' && at >= 0) to = at === 0 ? search ?? rows[0] : rows[at - 1];
  else if (e.key === 'Home' && at >= 0) to = rows[0];
  else if (e.key === 'End' && at >= 0) to = rows.at(-1);
  if (!to) return;
  e.preventDefault();
  to.focus();
}
