import { svg } from 'lit';

// The few icons the filter draws, inline and hidden from screen readers (the buttons are named).
const icon = (d: ReturnType<typeof svg>, size = 16) => svg`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const funnel = icon(svg`<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>`);
export const close = icon(svg`<path d="M6 6l12 12M18 6 6 18"/>`, 18);
export const closeSmall = icon(svg`<path d="M6 6l12 12M18 6 6 18"/>`, 12);
export const chevronRight = icon(svg`<path d="m9 6 6 6-6 6"/>`);
export const chevronLeft = icon(svg`<path d="m15 6-6 6 6 6"/>`, 22);
export const check = icon(svg`<path d="m5 12.5 4.5 4.5L19 7.5"/>`, 12);
export const reset = icon(svg`<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>`);
