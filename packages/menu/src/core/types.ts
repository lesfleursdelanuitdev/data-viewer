import type { TemplateResult } from 'lit';

/** Anything a menu (or a list's cell or card part) can show: text, a node (copied), or a Lit template. */
export type Content = string | Node | TemplateResult;

export type MenuItem = {
  id: string;
  label: string; // the item's name: always text
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  why?: string; // shown under a disabled item's label (in place of the description)
  confirm?: string; // asked in a built-in dialog before the action fires
  icon?: Content; // before the label; a string is text (an emoji works), a Node is copied
  description?: string; // a quieter second line, always shown
  content?: Node; // drawn (copied) in place of the label text: <lfdln-menu-item> markup
};

/** A line between items. */
export type MenuSeparator = { separator: true };
/** A label for the items after it (up to the next separator or heading). */
export type MenuHeading = { heading: string };
export type MenuEntry = MenuItem | MenuSeparator | MenuHeading;
