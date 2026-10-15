import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, fieldText, fieldValue, fill, isEmpty, parseText, type Fields } from '../src/core/card-template.ts';
import type { Column } from '../src/core/types.ts';

// A tiny stand-in for the DOM: just what the compiler and filler touch (no DOM in node).
class T {
  nodeType = 3;
  parentNode: E | null = null;
  nodeValue: string;
  constructor(v: string) {
    this.nodeValue = v;
  }
  remove() {
    this.parentNode?.drop(this);
  }
  cloneNode(): T {
    return new T(this.nodeValue);
  }
}
class E {
  nodeType = 1;
  nodeValue = null;
  parentNode: E | null = null;
  childNodes: (E | T)[] = [];
  attrs = new Map<string, string>();
  localName: string;
  constructor(localName: string, attrs: Record<string, string> = {}, kids: (E | T | string)[] = []) {
    this.localName = localName;
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
    for (const k of kids) this.append(typeof k === 'string' ? new T(k) : k);
  }
  get attributes() {
    return [...this.attrs].map(([name, value]) => ({ name, value }));
  }
  getAttribute(n: string) {
    return this.attrs.get(n) ?? null;
  }
  hasAttribute(n: string) {
    return this.attrs.has(n);
  }
  setAttribute(n: string, v: string) {
    this.attrs.set(n, v);
  }
  removeAttribute(n: string) {
    this.attrs.delete(n);
  }
  append(n: E | T) {
    n.parentNode = this;
    this.childNodes.push(n);
  }
  drop(n: E | T) {
    this.childNodes = this.childNodes.filter((c) => c !== n);
    n.parentNode = null;
  }
  remove() {
    this.parentNode?.drop(this);
  }
  cloneNode(): E {
    const c = new E(this.localName, Object.fromEntries(this.attrs));
    for (const k of this.childNodes) c.append(k.cloneNode());
    return c;
  }
  get textContent(): string {
    return this.childNodes.map((c) => (c instanceof T ? c.nodeValue : c.textContent)).join('');
  }
}
const h = (name: string, attrs: Record<string, string> = {}, ...kids: (E | T | string)[]) => new E(name, attrs, kids);
const frag = (...kids: (E | T | string)[]) => new E('#fragment', {}, kids);

// Fields for a plain row: text is the value as a string, url keeps only http(s) and relative.
function fields(row: Record<string, unknown>): Fields {
  return {
    text: (k) => fieldText(k, row, []),
    value: (k) => fieldValue(row, k),
    url: (v) => (/^(https?:|[\w-]+[/.])/.test(v.trim()) ? v : undefined),
  };
}
// Compiles a fragment and fills a copy of it for one row.
function run(root: E, row: Record<string, unknown>) {
  const plan = compile(root);
  const copy = (plan.source as E).cloneNode();
  const refs = fill(plan, copy, fields(row));
  return { plan, copy, refs };
}

test('parseText splits fixed text and fields; none gives null', () => {
  assert.equal(parseText('plain'), null);
  assert.deepEqual(parseText('{{name}}'), [{ key: 'name' }]);
  assert.deepEqual(parseText('Price: {{ price }} ({{a.b}})'), ['Price: ', { key: 'price' }, ' (', { key: 'a.b' }, ')']);
  assert.equal(parseText('{{}}'), null);
});

test('text placeholders, several in one string', () => {
  const { copy } = run(frag(h('p', {}, 'Hi {{name}}, {{n}} left')), { name: 'Rose', n: 3 });
  assert.equal(copy.textContent, 'Hi Rose, 3 left');
});

test('attribute placeholders, and text that looks like markup stays text', () => {
  const { copy } = run(frag(h('span', { title: '{{name}} ({{kind}})', class: 'x' }, '{{name}}')), { name: '<b>Rose</b>', kind: 'jam' });
  const span = copy.childNodes[0] as E;
  assert.equal(span.getAttribute('title'), '<b>Rose</b> (jam)');
  assert.equal(span.getAttribute('class'), 'x');
  assert.equal(span.childNodes.length, 1);
  assert.equal((span.childNodes[0] as T).nodeValue, '<b>Rose</b>');
});

test('nested keys read nested fields; missing ones are empty', () => {
  const { copy } = run(frag(h('p', {}, '{{shop.name}}|{{shop.none}}|{{nope}}|{{a.b.c}}')), { shop: { name: 'Fleurs' } });
  assert.equal(copy.textContent, 'Fleurs|||');
});

test('on… and style attributes with a placeholder are dropped, with a warning; without one they stay', () => {
  const root = frag(h('button', { onclick: 'go({{id}})', style: 'color: {{c}}', 'data-x': '{{id}}' }), h('i', { onclick: 'fixed()' }));
  const { copy, plan } = run(root, { id: 1, c: 'red' });
  const b = copy.childNodes[0] as E;
  assert.equal(b.hasAttribute('onclick'), false);
  assert.equal(b.hasAttribute('style'), false);
  assert.equal(b.getAttribute('data-x'), '1');
  assert.equal((copy.childNodes[1] as E).getAttribute('onclick'), 'fixed()');
  assert.equal(plan.warnings.length, 2);
  assert.match(plan.warnings[0]!, /onclick/);
});

test('addresses go through url(); an unsafe one removes the attribute', () => {
  const root = () => frag(h('a', { href: '{{link}}' }, 'go'), h('img', { src: '{{pic}}', alt: '' }), h('a', { href: '#fixed' }));
  const safe = run(root(), { link: 'https://example.com/a', pic: 'pics/a.jpg' }).copy;
  assert.equal((safe.childNodes[0] as E).getAttribute('href'), 'https://example.com/a');
  assert.equal((safe.childNodes[1] as E).getAttribute('src'), 'pics/a.jpg');
  const bad = run(root(), { link: 'javascript:alert(1)', pic: '' }).copy;
  assert.equal((bad.childNodes[0] as E).hasAttribute('href'), false);
  assert.equal((bad.childNodes[1] as E).hasAttribute('src'), false);
  // An address written without a placeholder is the author's own and stays as written.
  assert.equal((bad.childNodes[2] as E).getAttribute('href'), '#fixed');
});

test('srcset: every candidate must be safe', () => {
  const root = () => frag(h('img', { srcset: '{{a}} 1x, {{b}} 2x' }));
  assert.equal((run(root(), { a: 'a.jpg', b: 'b.jpg' }).copy.childNodes[0] as E).getAttribute('srcset'), 'a.jpg 1x, b.jpg 2x');
  assert.equal((run(root(), { a: 'a.jpg', b: 'javascript:x' }).copy.childNodes[0] as E).hasAttribute('srcset'), false);
});

test('scripts in the template are left out of every copy', () => {
  const { copy } = run(frag(h('p', {}, '{{name}}'), h('script', {}, 'alert(1)')), { name: 'x' });
  assert.equal(copy.childNodes.length, 1);
});

test('data-if removes the element when the field is empty, and goes from the copy', () => {
  // compile() changes its root, so each run gets a new one.
  const root = () => frag(h('img', { 'data-if': 'pic', src: '{{pic}}' }), h('span', { 'data-if': 'tags' }, '{{tags}}'), h('b', { 'data-if': 'n' }, '{{n}}'));
  for (const empty of [undefined, null, '', []]) {
    const { copy } = run(root(), { pic: empty, tags: empty, n: empty });
    assert.equal(copy.childNodes.length, 0, `empty: ${JSON.stringify(empty)}`);
  }
  const { copy } = run(root(), { pic: 'a.jpg', tags: ['a', 'b'], n: 0 });
  assert.equal(copy.childNodes.length, 3);
  assert.equal((copy.childNodes[0] as E).hasAttribute('data-if'), false);
  assert.equal((copy.childNodes[1] as E).textContent, 'a, b');
  assert.equal((copy.childNodes[2] as E).textContent, '0'); // zero is not empty
  assert.equal(isEmpty(false), false);
});

test('a data-if inside another data-if that goes is harmless', () => {
  const { copy } = run(frag(h('div', { 'data-if': 'a' }, h('span', { 'data-if': 'b' }, 'x')), h('p', {}, 'y')), {});
  assert.equal(copy.textContent, 'y');
});

test('the open control: data-open, else the first heading, else none', () => {
  const marked = run(frag(h('h3', {}, 'A'), h('p', { 'data-open': '' }, '{{name}}')), { name: 'Rose' });
  assert.equal(marked.refs.open?.localName, 'p');
  assert.equal(marked.refs.open?.hasAttribute('data-open'), true); // it stays on the element
  const heading = run(frag(h('div', {}, h('p', {}, 'x'), h('h4', {}, '{{name}}')), h('h2', {}, 'later')), { name: 'Rose' });
  assert.equal(heading.refs.open?.localName, 'h4');
  const none = run(frag(h('p', {}, 'x')), {});
  assert.equal(none.refs.open, null);
  assert.equal(none.plan.open, null);
});

test('dv-menu and dv-actions spots are found; data-action stays', () => {
  const { refs, copy } = run(frag(h('div', {}, h('dv-menu')), h('button', { 'data-action': 'aside' }, 'Aside'), h('dv-actions')), {});
  assert.deepEqual(refs.menus.map((e) => e.localName), ['dv-menu']);
  assert.deepEqual(refs.actions.map((e) => e.localName), ['dv-actions']);
  assert.equal((copy.childNodes[1] as E).getAttribute('data-action'), 'aside');
});

test('the plan is reused: two rows from one plan', () => {
  const plan = compile(frag(h('p', {}, '{{name}}')));
  const a = (plan.source as E).cloneNode();
  const b = (plan.source as E).cloneNode();
  fill(plan, a, fields({ name: 'A' }));
  fill(plan, b, fields({ name: 'B' }));
  assert.equal(a.textContent, 'A');
  assert.equal(b.textContent, 'B');
  assert.equal((plan.source as E).textContent, '{{name}}');
});

type Row = Record<string, unknown>;
test('fieldText: a column key is formatted like its column; other keys give the plain value', () => {
  const cols: Column<Row>[] = [
    { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
    { key: 'calc', label: 'Calc', value: (r) => Number(r.a) * 2, type: 'number' },
  ];
  const row = { price: 6.5, a: 21, plain: 6.5, tags: ['sun', 'shade', null], when: { y: 2026 } };
  assert.equal(fieldText('price', row, cols, 'en-US'), '€6.50');
  assert.equal(fieldText('calc', row, cols, 'en-US'), '42');
  assert.equal(fieldText('plain', row, cols, 'en-US'), '6.5');
  assert.equal(fieldText('tags', row, cols), 'sun, shade');
  assert.equal(fieldText('when', row, cols), ''); // an object prints as nothing, not [object Object]
  assert.equal(fieldText('when.y', row, cols), '2026');
  assert.equal(fieldText('missing', row, cols), '');
});

test('fieldValue: a key with a dot in it wins over the nested path', () => {
  assert.equal(fieldValue({ 'a.b': 1, a: { b: 2 } }, 'a.b'), 1);
  assert.equal(fieldValue({ a: { b: 2 } }, 'a.b'), 2);
  assert.equal(fieldValue({ a: null }, 'a.b'), undefined);
});

test('an address with a field is not in the copies until it is filled, so nothing loads "{{picture}}"', () => {
  const plan = compile(frag(h('img', { src: '{{picture}}', alt: '', 'data-if': 'picture' }), h('a', { href: 'plants/{{id}}', title: '{{name}}' })));
  const [img, a] = (plan.source as E).childNodes as [E, E];
  assert.equal(img.hasAttribute('src'), false);
  assert.equal(a.hasAttribute('href'), false);
  assert.equal(a.getAttribute('title'), '{{name}}'); // not an address: harmless as written
  const copy = (plan.source as E).cloneNode();
  fill(plan, copy, fields({ picture: 'pics/rose.jpg', id: 7, name: 'Rose' }));
  assert.equal((copy.childNodes[0] as E).getAttribute('src'), 'pics/rose.jpg');
  assert.equal((copy.childNodes[1] as E).getAttribute('href'), 'plants/7');
});
