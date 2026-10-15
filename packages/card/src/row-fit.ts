import { nothing } from 'lit';
import { AsyncDirective, directive, PartType, type ElementPart, type PartInfo } from 'lit/async-directive.js';
import { fitRow } from './fit.ts';

// The "row" footer, live: it measures its buttons once (again when they change), watches the
// row's width with a ResizeObserver, and shows the buttons that fit, hiding the rest. The More
// menu holds every item; the ones shown in the row are hidden in it (the menu's keyboard skips
// hidden items), and More itself is hidden when nothing overflows. Nothing is re-drawn by Lit:
// only `hidden` changes, so a resize never re-renders the card.
class RowFit extends AsyncDirective {
  private el: HTMLElement | undefined;
  private ro: ResizeObserver | undefined;
  private key = '';
  private widths: { buttons: number[]; more: number; primary: number } | undefined;
  private max = Infinity;
  private danger: boolean[] = [];

  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.ELEMENT) throw new Error('rowFit() goes on an element');
  }

  render(_max: number, _danger: boolean[], _key: string) {
    return nothing;
  }

  override update(part: ElementPart, [max, danger, key]: [number, boolean[], string]) {
    this.el = part.element as HTMLElement;
    this.max = max;
    this.danger = danger;
    if (key !== this.key) {
      this.key = key;
      this.widths = undefined; // new buttons: measure again
    }
    this.watch();
    // After this render has put the buttons in place.
    queueMicrotask(() => this.fit());
    return nothing;
  }

  private watch(): void {
    if (this.ro || !this.el || typeof ResizeObserver === 'undefined') return;
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this.el);
  }

  protected override disconnected(): void {
    this.ro?.disconnect();
    this.ro = undefined;
  }

  protected override reconnected(): void {
    this.watch();
  }

  private parts(row: HTMLElement) {
    return {
      buttons: [...row.querySelectorAll<HTMLElement>(':scope > [data-fit]')],
      more: row.querySelector<HTMLElement>(':scope > .lfdln-card-more'),
      primary: row.querySelector<HTMLElement>(':scope > .lfdln-card-action'),
    };
  }

  private fit(): void {
    const row = this.el;
    if (!row?.isConnected) return;
    const { buttons, more, primary } = this.parts(row);
    const w = (e: HTMLElement | null) => (e ? e.getBoundingClientRect().width : 0);
    if (!this.widths || (this.widths.buttons.some((x) => x === 0) && row.clientWidth > 0)) {
      for (const b of buttons) b.hidden = false;
      if (more) more.hidden = false;
      this.widths = { buttons: buttons.map(w), more: w(more), primary: w(primary) };
      // Hold the row at its tallest (everything shown), so hiding buttons never changes its
      // size: the ResizeObserver then never sees a change made by its own callback.
      row.style.minHeight = '';
      row.style.minHeight = `${row.getBoundingClientRect().height}px`;
    }
    const style = getComputedStyle(row);
    const gap = parseFloat(style.columnGap) || 0;
    const inner = row.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const kept = this.widths.primary ? this.widths.primary + gap : 0;
    // Items past the buttons drawn (more than max) are in More only.
    const all = this.danger.map((d, i) => ({ width: this.widths!.buttons[i] ?? 0, danger: d }));
    const drawn = buttons.length;
    const { shown } = fitRow(all.slice(0, drawn), { available: inner - kept, more: this.widths.more, gap, max: this.max });
    const show = new Set(shown);
    buttons.forEach((b, i) => { b.hidden = !show.has(i); });
    const overflow = all.length - show.size;
    if (more) {
      more.hidden = overflow === 0;
      // The menu's items are in the same order as the row's: hide the ones the row shows.
      const list = more.querySelector('.lfdln-menu-list');
      if (list) {
        [...list.querySelectorAll<HTMLElement>('[role=menuitem]')].forEach((m, i) => { m.hidden = show.has(i); });
        // A line with nothing shown on one side of it goes too.
        const kids = [...list.querySelectorAll<HTMLElement>('[role=menuitem], [role=separator]')];
        kids.forEach((k, i) => {
          if (k.getAttribute('role') !== 'separator') return;
          const visible = (x: HTMLElement) => x.getAttribute('role') === 'menuitem' && !x.hidden;
          k.hidden = !kids.slice(0, i).some(visible) || !kids.slice(i + 1).some(visible);
        });
      }
    }
  }
}

/** Fits a row of action buttons on one line (see RowFit). `danger` per item; `key` changes when the buttons do. */
export const rowFit = directive(RowFit);
