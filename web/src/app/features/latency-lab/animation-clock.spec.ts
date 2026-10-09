import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectAnimationClock } from './animation-clock';

function mockReducedMotion(matches: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
        listeners.push(listener);
      },
    })),
  );
  return {
    change: (next: boolean) => {
      for (const listener of listeners) listener({ matches: next });
    },
  };
}

function clockFor(isActive: () => boolean) {
  return runInInjectionContext(TestBed.inject(Injector), () => injectAnimationClock(isActive));
}

describe('injectAnimationClock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ticks every frame while something is pending', () => {
    const clock = clockFor(() => true);
    TestBed.tick();
    const first = clock();

    vi.advanceTimersByTime(48);

    expect(clock()).toBeGreaterThan(first ?? 0);
  });

  it('stops asking for frames once nothing is pending', () => {
    const isPending = signal(true);
    const request = vi.spyOn(window, 'requestAnimationFrame');
    clockFor(() => isPending());
    TestBed.tick();
    vi.advanceTimersByTime(32);

    isPending.set(false);
    TestBed.tick();
    request.mockClear();
    vi.advanceTimersByTime(200);

    expect(request).not.toHaveBeenCalled();
  });

  it('never starts a loop on a page with nothing pending', () => {
    const clock = clockFor(() => false);
    TestBed.tick();
    const before = clock();

    vi.advanceTimersByTime(500);

    expect(clock()).toBe(before);
  });

  it('is off, and reads null, when the user prefers reduced motion', () => {
    mockReducedMotion(true);

    const clock = clockFor(() => true);
    TestBed.tick();
    vi.advanceTimersByTime(500);

    expect(clock()).toBeNull();
  });

  it('follows the preference when it changes while the page is open', () => {
    const media = mockReducedMotion(false);
    const clock = clockFor(() => true);
    TestBed.tick();
    expect(clock()).not.toBeNull();

    media.change(true);
    TestBed.tick();

    expect(clock()).toBeNull();
  });
});
