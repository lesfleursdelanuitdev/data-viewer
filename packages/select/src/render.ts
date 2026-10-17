import { html, svg, type TemplateResult } from 'lit';

// The chevron's path spans its box edge to edge, so the box's edges are its visible edges.
const PATH = 'M1 4l5 5 5-5';
const chevronSvg = svg`<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d=${PATH}/></svg>`;

// The same chevron as markup, for code that draws without Lit (the HTML parser puts it in the
// SVG namespace; the string is ours, never a page's).
const CHEVRON_MARKUP = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATH}"/></svg>`;

/** The chevron as an element, for code that draws without Lit (<lfdln-select> itself). */
export function chevronElement(doc: Document = document): HTMLSpanElement {
  const span = doc.createElement('span');
  span.className = 'lfdln-select-chevron';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = CHEVRON_MARKUP;
  return span;
}

/**
 * A real <select> (drawn by the caller, events and all) in the dropdown's wrapper, with the
 * chevron: the one drawing the packages share. `className` goes on the wrapper, which is the
 * piece a layout places (a flex item, say). Call addSelectStyles() once, too.
 */
export function renderSelect(select: TemplateResult, className?: string): TemplateResult {
  return html`<span class=${className ? `lfdln-select ${className}` : 'lfdln-select'}>${select}<span
    class="lfdln-select-chevron" aria-hidden="true">${chevronSvg}</span></span>`;
}
