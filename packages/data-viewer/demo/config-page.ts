import { configure, defineList, define } from '../src/index.ts';

define();
(window as unknown as { dv: unknown }).dv = { configure, defineList };
