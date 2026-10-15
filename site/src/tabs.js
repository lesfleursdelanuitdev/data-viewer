// Tab bars shared by the landing and docs pages: click or arrow keys pick a tab, its panel shows.
// onChange(index) runs after the switch.
export function tabs(bar, panels, onChange = () => {}) {
  const list = [...bar.querySelectorAll('[role="tab"]')];
  const pick = (i, focus) => {
    list.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      if (panels[j]) panels[j].hidden = i !== j;
    });
    if (focus) list[i].focus();
    onChange(i);
  };
  list.forEach((t, i) => {
    t.addEventListener('click', () => pick(i, false));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); pick(e.key === 'Home' ? 0 : list.length - 1, true); }
      else if (step) { e.preventDefault(); pick((i + step + list.length) % list.length, true); }
    });
  });
  return pick;
}

// Copies text and shows "Copied" in label for 1.4 s.
export function copier(label) {
  let timer;
  return (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    label.textContent = 'Copied';
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = 'Copy'; }, 1400);
  };
}
