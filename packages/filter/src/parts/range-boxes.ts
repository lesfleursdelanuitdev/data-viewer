import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';
import type { FilterRange, FilterSection, FilterWords } from '../core/types.ts';

export type RangeBoxesOptions = {
  cls: string; // the group's class (the design lays the two boxes out)
  section: Extract<FilterSection, { kind: 'range' }>;
  range: FilterRange; // the ends shown
  words: FilterWords;
  label?: string; // the group's name, or
  labelledBy?: string; // the id of its heading
  // 'input': on every key, the ends as typed (a draft); 'change': when a box is left or Enter is
  // pressed, the ends trimmed (a style that applies at once).
  on: 'input' | 'change';
  onRange(from: string, to: string): void;
};

/** The ends the From and To boxes give: as typed while drafting, trimmed when applied at once. */
export function typedEnds(from: string, to: string, on: 'input' | 'change'): [string, string] {
  return on === 'input' ? [from, to] : [from.trim(), to.trim()];
}

/**
 * A range's From and To boxes in a group. Both are read together, so a change in one never loses
 * the other.
 */
export function rangeBoxes(kit: FilterKit, o: RangeBoxesOptions): TemplateResult {
  const typed = (e: Event) => {
    const [a, b] = (e.currentTarget as HTMLElement).closest('[role=group]')!.querySelectorAll('input');
    o.onRange(...typedEnds(a!.value, b!.value, o.on));
  };
  const box = (word: string, val: string | undefined) => kit.html`<label><span>${word}</span><input type="text"
    autocomplete="off" inputmode=${o.section.type === 'date' ? kit.nothing : 'decimal'} .value=${kit.live(val ?? '')}
    @input=${o.on === 'input' ? typed : kit.nothing} @change=${o.on === 'change' ? typed : kit.nothing}></label>`;
  return kit.html`<div class=${o.cls} role="group" aria-label=${o.label ?? kit.nothing}
    aria-labelledby=${o.labelledBy ?? kit.nothing}>${box(o.words.from, o.range.from)}${box(o.words.to, o.range.to)}</div>`;
}
