import { chevronElement } from './render.ts';
import { addSelectStyles } from './styles.ts';

/**
 * <lfdln-select>: wraps the real <select> inside it, adds the chevron and the style. Everything
 * else stays the select's own: its value, its change and input events, its form, the keyboard,
 * screen readers and the phone's picker. No shadow root, no properties.
 */
export class LfdlnSelect extends HTMLElement {
  connectedCallback(): void {
    addSelectStyles(this.ownerDocument);
    if (!this.querySelector(':scope > .lfdln-select-chevron')) this.append(chevronElement(this.ownerDocument));
  }

  /** The <select> inside. */
  get select(): HTMLSelectElement | null {
    return this.querySelector(':scope > select');
  }
}
