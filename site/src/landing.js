// The landing page: the hero's code tabs and the npm Copy button.
import { tabs, copier } from '/js/tabs.js';

const bar = document.querySelector('.code-panel [role="tablist"]');
tabs(bar, [...document.querySelectorAll('.code-panel [role="tabpanel"]')]);

for (const btn of document.querySelectorAll('[data-copy]')) {
  const copy = copier(btn.querySelector('[data-copy-label]'));
  btn.addEventListener('click', () => copy(btn.dataset.copy));
}
