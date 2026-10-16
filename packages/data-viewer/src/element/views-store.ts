// The saved views store (filter-style="views", S3-D1): the user views of one viewer, kept in
// localStorage under `<remember-as>.views` (or given by the page as `savedViews`), the tabs a
// style draws from them, and the handlers that pick, save, rename, delete and undo. It lives in
// the views add-on, not in the standalone viewer: a style attaches it as `store` (see
// ViewerFilterStyle), and the viewer only calls draw() and stop().
import { defaultViewsWords } from '@lesfleursdelanuitdev/filter/views';
import { normalise, type FilterSection, type FilterStyleHandlers, type FilterStyleViews, type FilterValue, type SavedView, type ViewTab } from '@lesfleursdelanuitdev/filter/parts';
import type { AddressQuery } from '../core/address.ts';
import type { Query, View } from '../core/types.ts';
import { currentUserView, readViews, sameState, viewKey } from '../core/saved-views.ts';

/** How long the undo toast shows after a delete. */
export const UNDO_MS = 5000;

/**
 * The viewer members the store reads and calls (LfdlnDataViewer's). The store may be in an
 * add-on file of another version than the viewer's, so this is a contract like the registry's:
 * keep it backwards compatible.
 */
export type ViewsHost = HTMLElement & {
  rememberAs?: string;
  savedViews?: SavedView[];
  views?: Pick<View<unknown>, 'key' | 'label' | 'count'>[];
  total?: number;
  text: { allViews?: string };
  updateComplete: Promise<boolean>;
  requestUpdate(): void;
  _q: AddressQuery;              // the applied state
  _fDraft: FilterValue | null;   // the open draft; null closes it
  _searchText: string;           // the search box's text
  _change(over: Partial<AddressQuery>): void; // applies a change (address, dv-query)
};

/** What the viewer uses: the views part of a drawing, and stop() when it leaves the page. */
export type ViewsStore = {
  // count: browser mode's count of the list's state with `q` on top (not called in server mode).
  draw(sections: FilterSection[], count: (q: Partial<Query>) => number | null): { view: { views: FilterStyleViews }; on: Partial<FilterStyleHandlers> };
  stop(): void;
};

// Storage keys whose saved views couldn't all be read, warned about once per page.
const warned = new Set<string>();

/** A store for one viewer. */
export function viewsStore(host: ViewsHost): ViewsStore {
  let list: SavedView[] = [];
  let key: string | undefined; // the storage key last read ('' none); undefined: read again
  let given: SavedView[] | undefined; // the page's savedViews last copied
  let last: string | null = null; // the user view last picked or saved
  let renaming: string | null = null;
  let undo: { view: SavedView; index: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // The views to show: the page's savedViews (copied when the page sets a new array), else
  // storage, read again when remember-as changes. Without remember-as they stay in memory.
  const load = () => {
    if (host.savedViews !== undefined) {
      if (host.savedViews !== given) list = Array.isArray(given = host.savedViews) ? [...given] : [];
      key = undefined;
      return;
    }
    given = undefined;
    const now = host.rememberAs ? `${host.rememberAs}.views` : '';
    if (now === key) return;
    key = now;
    if (!now) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(now);
    } catch {
      // storage blocked: views last until the page closes
    }
    const read = readViews(raw);
    if (read.bad && !warned.has(now)) {
      warned.add(now);
      console.warn(`lfdln-data-viewer: some saved views in localStorage "${now}" could not be read and were left out.`);
    }
    list = read.views;
  };

  // A new list: stored (only from storage, never over a page's savedViews), announced, drawn.
  const set = (next: SavedView[]) => {
    list = next;
    if (host.savedViews === undefined && key) {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage blocked: views last until the page closes
      }
    }
    host.dispatchEvent(new CustomEvent('views-change', { detail: { views: [...next] }, bubbles: true, composed: true }));
    host.requestUpdate();
  };

  // A tab is a whole state (PLANNER CHOICE 2): the draft closes, the search box shows its search.
  const apply = (view: string, filters: FilterValue, search: string) => {
    host._fDraft = null;
    const q = host._q;
    if (q.view === view && sameState({ filter: filters, search }, q)) return host.requestUpdate();
    host._searchText = search;
    host._change({ view, filters: structuredClone(filters), search, page: 1 });
  };

  // The toast goes; focus that was in it moves to the current tab (PLANNER CHOICE 8), or to the
  // first tab (a style marks its tabs data-view-key) when none is current, never to the page.
  const endUndo = () => {
    clearTimeout(timer);
    const focus = document.activeElement;
    const inToast = Boolean(focus && host.contains(focus) && focus.closest('[role="status"]'));
    undo = null;
    host.requestUpdate();
    if (inToast) {
      void host.updateComplete.then(() => (host.querySelector<HTMLElement>('[aria-current="true"]')
        ?? host.querySelector<HTMLElement>('[data-view-key]'))?.focus());
    }
  };

  let sections: FilterSection[] = []; // the last drawing's, for Save
  const on: Partial<FilterStyleHandlers> = {
    onView: (k) => {
      const v = list.find((x) => x.key === k);
      if (v) last = k;
      apply(v ? '' : k, v ? v.filter : {}, v?.search ?? '');
    },
    onSaveView: (label) => {
      const filter = normalise(sections, host._fDraft ?? host._q.filters ?? {});
      const search = host._q.search.trim();
      const view: SavedView = { key: viewKey(new Set(list.map((v) => v.key))), label, filter };
      if (search) view.search = search;
      last = view.key;
      set([...list, view]);
      apply('', filter, search);
    },
    onRenaming: (k) => {
      renaming = k;
      host.requestUpdate();
    },
    onRename: (k, label) => {
      renaming = null;
      const name = label.trim();
      const at = list.findIndex((v) => v.key === k);
      if (name && at >= 0 && list[at]!.label !== name) set(list.map((v, i) => (i === at ? { ...v, label: name } : v)));
      else host.requestUpdate();
    },
    onDeleteView: (k) => {
      const index = list.findIndex((v) => v.key === k);
      if (index < 0) return;
      clearTimeout(timer);
      undo = { view: list[index]!, index };
      if (renaming === k) renaming = null;
      set(list.filter((_, i) => i !== index));
      timer = setTimeout(endUndo, UNDO_MS);
    },
    onUndoDelete: () => {
      if (!undo) return;
      const next = [...list];
      next.splice(Math.min(undo.index, next.length), 0, undo.view);
      endUndo();
      set(next);
    },
  };

  return {
    draw(now, count) {
      sections = now;
      load();
      const q = host._q;
      const server = host.total !== undefined && host.total !== null;
      const mine = currentUserView(list, q, last);
      const pages = host.views?.length ? host.views : [{ key: '', label: host.text.allViews ?? defaultViewsWords.allViews }];
      const tabs: ViewTab[] = [
        ...pages.map((v) => ({
          key: v.key,
          label: v.label,
          count: v.count ?? (server ? null : count({ view: v.key, search: '', filters: undefined })),
          user: false,
          current: !mine && v.key === q.view,
        })),
        ...list.map((v) => ({
          key: v.key,
          label: v.label,
          count: server ? null : count({ view: '', search: v.search ?? '', filters: v.filter }),
          user: true,
          current: v.key === mine,
        })),
      ];
      return { view: { views: { tabs, renaming, undo: undo && { label: undo.view.label } } }, on };
    },
    stop() {
      clearTimeout(timer);
      undo = null;
    },
  };
}
