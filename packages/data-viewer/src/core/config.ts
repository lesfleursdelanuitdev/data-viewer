// A list's setup as one object (from a config module or configure()): which keys are applied,
// in what order, and what is left over. No DOM here.

/**
 * The element properties a config may set, in the order they are applied: columns and cards
 * before rows, and rows before total, so the first drawing has everything it needs.
 */
export const CONFIG_KEYS = [
  'label', 'columns', 'views', 'cardOf', 'cardTemplate', 'cardMount', 'cardTemplateId', 'searchKeys', 'searchIn', 'searchSubmitLabel', 'filterLabel', 'filterChips', 'words',
  'cardTitle', 'cardPicture', 'cardFacts', 'cardMeta', 'cardValue', 'cardHref', 'openEvent',
  'pageSize', 'pageSizes', 'pager', 'layout', 'phoneLayout', 'layoutSwitch', 'tableLabel', 'cardsLabel', 'layoutIcons', 'cardActions', 'cardActionsMax', 'cardMoreLabel',
  'rememberAs', 'compact', 'urlState', 'state', 'adapter', 'src', 'facets', 'rows', 'total',
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type SplitConfig = {
  props: [ConfigKey, unknown][];
  on: [string, (e: Event) => void][];
  load: ((...args: never[]) => unknown) | undefined;
  unknown: string[];
  problems: string[];
};

const known = new Set<string>(CONFIG_KEYS);

/** Splits a config object into properties to set, event handlers, load, and keys it doesn't know. */
export function splitConfig(raw: unknown): SplitConfig {
  const out: SplitConfig = { props: [], on: [], load: undefined, unknown: [], problems: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const cfg = raw as Record<string, unknown>;
  for (const k of CONFIG_KEYS) if (k in cfg && cfg[k] !== undefined) out.props.push([k, cfg[k]]);
  for (const k of Object.keys(cfg)) if (!known.has(k) && k !== 'on' && k !== 'load') out.unknown.push(k);
  if (cfg.load !== undefined) {
    if (typeof cfg.load === 'function') out.load = cfg.load as SplitConfig['load'];
    else out.problems.push('load is not a function');
  }
  if (cfg.on !== undefined) {
    if (!cfg.on || typeof cfg.on !== 'object') out.problems.push('on is not an object');
    else {
      for (const [type, fn] of Object.entries(cfg.on as Record<string, unknown>)) {
        if (typeof fn === 'function') out.on.push([type, fn as (e: Event) => void]);
        else out.problems.push(`on.${type} is not a function`);
      }
    }
  }
  return out;
}

/** The keys not warned about yet (each is said once per page), marked as warned. */
export function newWarnings(keys: string[], warned: Set<string>): string[] {
  const fresh = keys.filter((k) => !warned.has(k));
  for (const k of fresh) warned.add(k);
  return fresh;
}
