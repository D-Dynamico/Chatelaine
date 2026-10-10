import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchShortcut } from './search-shortcut';

@Component({
  imports: [SearchShortcut],
  template: `
    <input class="search" appSearchShortcut />
    <input class="other" />
    <button type="button">Elsewhere</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

function setUp() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  const host = fixture.nativeElement as HTMLElement;
  return {
    search: host.querySelector<HTMLInputElement>('.search'),
    other: host.querySelector<HTMLInputElement>('.other'),
    button: host.querySelector('button'),
  };
}

function press(target: HTMLElement | null, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: '/',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target?.dispatchEvent(event);
  return event;
}

describe('SearchShortcut', () => {
  it('moves focus to the search box when "/" is pressed outside a field', () => {
    const { search, button } = setUp();
    button?.focus();

    const event = press(button);

    expect(document.activeElement).toBe(search);
    expect(event.defaultPrevented).toBe(true);
    expect(search?.getAttribute('aria-keyshortcuts')).toBe('/');
  });

  it('lets "/" be typed into another field', () => {
    const { search, other } = setUp();
    other?.focus();

    const event = press(other);

    expect(document.activeElement).not.toBe(search);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores "/" with a modifier, which belongs to the browser', () => {
    const { search, button } = setUp();
    button?.focus();

    press(button, { ctrlKey: true });

    expect(document.activeElement).not.toBe(search);
  });
});
