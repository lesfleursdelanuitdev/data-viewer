// A docs page: the phone page picker, the npm Copy pill, and (on pages with one) the panel's
// tabs, controls, live demo and events strip.
import { copier } from '/js/tabs.js';

// The <select> that stands in for the sidebar below 900px: picking a page goes to its address.
document.querySelector('[data-page-pick]')?.addEventListener('change', (e) => { location.href = e.target.value; });

for (const btn of document.querySelectorAll('[data-copy]')) {
  const copy = copier(btn.querySelector('[data-copy-label]'));
  btn.addEventListener('click', () => copy(btn.dataset.copy));
}
