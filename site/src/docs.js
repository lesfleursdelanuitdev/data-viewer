// A docs page: the phone page picker, the npm Copy pill, and the panel's tabs, Copy, controls,
// live demo and events strip. The page's text and code are already in the HTML (site/build.mjs);
// this only wires them up. The demos use the real components from /js/data-viewer.standalone.js.
import { tabs, copier } from '/js/tabs.js';
import { PAGES } from '/js/docs-content.js';

const EVENT_NAMES = ['dv-open', 'dv-action', 'dv-layout', 'menu-action', 'page-change', 'search-change', 'filter-change', 'card-open'];
const DEFAULT_CONTROL = { delay: '900', scheme: 'dark' };
const P = PAGES[document.body.dataset.page];

// The <select> that stands in for the sidebar below 900px: picking a page goes to its address.
document.querySelector('[data-page-pick]')?.addEventListener('change', (e) => { location.href = e.target.value; });

for (const btn of document.querySelectorAll('[data-copy]')) {
  const copy = copier(btn.querySelector('[data-copy-label]'));
  btn.addEventListener('click', () => copy(btn.dataset.copy));
}

const panel = document.querySelector('.panel');
if (panel && P) setUpPanel();

function setUpPanel() {
  const hasDemo = !!P.mount;
  const tabPanels = [...panel.querySelectorAll('[role="tabpanel"]')];
  const copyBtn = panel.querySelector('[data-copy-code]');
  const copy = copier(copyBtn);
  const demoOnly = [...panel.querySelectorAll('[data-demo-only]')];
  let current = 0;
  let libOk = false;

  tabs(panel.querySelector('[role="tablist"]'), tabPanels, (i) => {
    current = i;
    const onDemo = hasDemo && i === 0;
    copyBtn.hidden = onDemo;
    copyBtn.textContent = 'Copy';
    for (const el of demoOnly) el.hidden = !onDemo || (el.hasAttribute('data-events') && !libOk);
  });
  copyBtn.addEventListener('click', () => copy(tabPanels[current].textContent));

  if (hasDemo) startDemo(() => { libOk = true; });
}

// ── the live demo ──
async function startDemo(onLoaded) {
  const host = panel.querySelector('[data-host]');
  const status = panel.querySelector('[data-status]');
  const events = panel.querySelector('[data-events]');
  const list = events.querySelector('[data-list]');
  const empty = events.querySelector('[data-empty]');
  const clear = events.querySelector('[data-clear]');
  const busy = panel.querySelector('[data-busy]');
  const failBox = panel.querySelector('[data-toggle="fail"]');

  // The controls' values, read by the demo while it runs (the server's delay) or passed to onControl.
  const controls = {};
  for (const c of P.controls || []) controls[c.key] = DEFAULT_CONTROL[c.key] ?? c.options[0][0];
  for (const input of panel.querySelectorAll('[data-control]')) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      controls[input.dataset.control] = input.value;
      P.onControl?.(host, input.dataset.control, input.value);
    });
  }

  // The events strip: the last six, newest first, older ones fading.
  let rows = [];
  const draw = () => {
    list.replaceChildren(...rows.map((e, i) => {
      const li = document.createElement('li');
      li.className = 'event';
      li.style.opacity = String(i === 0 ? 1 : Math.max(0.35, 0.85 - i * 0.12));
      const name = Object.assign(document.createElement('span'), { className: 'event-name', textContent: e.name });
      const detail = Object.assign(document.createElement('span'), { className: 'event-detail', textContent: e.detail, title: e.detail });
      li.append(name, detail);
      return li;
    }));
    events.classList.toggle('has-events', rows.length > 0);
    empty.hidden = rows.length > 0;
    clear.hidden = rows.length === 0;
  };
  const log = (name, detail) => { rows = [{ name, detail: brief(detail) }, ...rows].slice(0, 6); draw(); };
  clear.addEventListener('click', () => { rows = []; draw(); });
  for (const n of EVENT_NAMES) host.addEventListener(n, (e) => log(n, e.detail));
  // A page's own events, each with the part of its detail to show (filter styles: dv-query's filters).
  for (const [n, pick] of Object.entries(P.events || {})) host.addEventListener(n, (e) => log(n, pick(e.detail)));

  let mod;
  try {
    mod = await import('/js/data-viewer.standalone.js');
  } catch {
    status.className = 'demo-missing';
    status.innerHTML = '<strong>The live components didn’t load</strong><p>This page couldn’t load <code>/js/data-viewer.standalone.js</code>. Reload the page to try again; the code tabs above work without it.</p>';
    return;
  }
  status.remove();
  onLoaded();
  events.hidden = panel.querySelector('[role="tab"][aria-selected="true"]')?.id !== 'tab-0';

  P.mount(host, {
    mod,
    controls,
    log,
    setBusy: (b) => { if (busy) busy.hidden = !b; },
    takeFail: () => {
      const f = !!failBox?.checked;
      if (f) failBox.checked = false;
      return f;
    },
  });
}

// An event's detail as short JSON: rows shortened to their name or number, elements to their tag.
function brief(d) {
  try {
    return JSON.stringify(d, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && (v.name || v.number) && k)
      ? (v.name || v.number)
      : (v instanceof Element ? `<${v.tagName.toLowerCase()}>` : v)) ?? '';
  } catch {
    return '';
  }
}
