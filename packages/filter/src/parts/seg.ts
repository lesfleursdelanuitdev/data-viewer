import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

export type SegOptions = {
  label: string; // the group's name
  options: { value: string; label: string }[];
  value: string; // the picked option's value
  onPick(value: string): void;
};

// Arrows (and Home, End) move to an option and pick it, as radio buttons do.
function onKey(e: KeyboardEvent, o: SegOptions): void {
  const all = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role=radio]')];
  const at = all.indexOf(document.activeElement as HTMLElement);
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1
    : step !== undefined && at >= 0 ? (at + step + all.length) % all.length : -1;
  if (to < 0) return;
  e.preventDefault();
  all[to]!.focus();
  o.onPick(o.options[to]!.value);
}

/** A segmented control (role="radiogroup"): one stop in the tab order, arrow keys move and pick. */
export function seg(kit: FilterKit, o: SegOptions): TemplateResult {
  return kit.html`<div class="lfdln-filter-seg" role="radiogroup" aria-label=${o.label}
    @keydown=${(e: KeyboardEvent) => onKey(e, o)}>${o.options.map((x, i) => {
    const on = x.value === o.value;
    // With none picked (a value it no longer offers), the first is the tab stop.
    const stop = on || (i === 0 && !o.options.some((y) => y.value === o.value));
    return kit.html`<button type="button" role="radio" class="lfdln-filter-seg-opt" aria-checked=${on ? 'true' : 'false'}
      tabindex=${stop ? '0' : '-1'} @click=${() => o.onPick(x.value)}>${x.label}</button>`;
  })}</div>`;
}
