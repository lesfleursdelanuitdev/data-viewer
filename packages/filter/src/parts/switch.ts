import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

export type SwitchOptions = {
  on: boolean;
  onToggle(): void;
  label?: string; // its name when no <label> holds it
  describedBy?: string; // the id of its helper text
};

/** A 34×20 switch (role="switch"); Space and Enter toggle it, as on any button. */
export function toggleSwitch(kit: FilterKit, o: SwitchOptions): TemplateResult {
  return kit.html`<button type="button" class="lfdln-filter-switch" role="switch" aria-checked=${o.on ? 'true' : 'false'}
    aria-label=${o.label ?? kit.nothing} aria-describedby=${o.describedBy ?? kit.nothing}
    @click=${o.onToggle}><span class="lfdln-filter-knob"></span></button>`;
}

export type SwitchRowOptions = { id: string; label: string; hint?: string; on: boolean; onToggle(): void };

/** A row with the switch on the right: its label (which names it, and toggles it when clicked) and a helper line. */
export function switchRow(kit: FilterKit, o: SwitchRowOptions): TemplateResult {
  const hint = o.hint ? `${o.id}-hint` : undefined;
  return kit.html`<label class="lfdln-filter-switch-row"><span class="lfdln-filter-switch-text"><span>${o.label}</span>${o.hint
    ? kit.html`<span class="lfdln-filter-hint" id=${hint}>${o.hint}</span>` : kit.nothing}</span>${toggleSwitch(kit, {
    on: o.on, onToggle: o.onToggle, describedBy: hint })}</label>`;
}
