import type { Content } from '../core/types.ts';

/** Content for one drawing: a Node can sit in one place only, so each drawing gets a copy. */
export function copyOf(c: Content): Content {
  return c instanceof Node ? c.cloneNode(true) : c;
}
