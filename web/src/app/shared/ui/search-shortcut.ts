import { Directive, ElementRef, inject } from '@angular/core';

export const SEARCH_SHORTCUT_KEY = '/';

/** Typing "/" into a field must type it, so the shortcut only fires outside editable ones. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * "/" moves focus to the list's search box from anywhere on the page, the convention of
 * GitHub, Linear and most issue trackers (§40). Only one list is on a page at a time, so
 * one listener per search box never competes with another. `aria-keyshortcuts` tells
 * assistive tech the key exists.
 */
@Directive({
  selector: 'input[appSearchShortcut]',
  host: {
    'aria-keyshortcuts': SEARCH_SHORTCUT_KEY,
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class SearchShortcut {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef);

  protected onKeydown(event: KeyboardEvent): void {
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    if (event.key !== SEARCH_SHORTCUT_KEY || hasModifier || isEditable(event.target)) return;
    event.preventDefault();
    this.input.nativeElement.focus();
    this.input.nativeElement.select();
  }
}
