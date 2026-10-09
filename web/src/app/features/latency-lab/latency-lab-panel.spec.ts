import { TestBed } from '@angular/core/testing';
import { LATENCY_PRESETS, matchingPreset } from './presets';
import { LatencySettingsStore } from '../../core/latency/latency-settings-store';
import { RequestLogStore } from '../../core/latency/request-log-store';
import { LatencyLabPanel } from './latency-lab-panel';

async function render(canReloadDashboard = true) {
  const fixture = TestBed.createComponent(LatencyLabPanel);
  fixture.componentRef.setInput('canReloadDashboard', canReloadDashboard);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const settings = TestBed.inject(LatencySettingsStore);
  const log = TestBed.inject(RequestLogStore);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const buttonNamed = (name: string): HTMLButtonElement | null =>
    [...host.querySelectorAll('button')].find((button) => button.textContent.includes(name)) ??
    null;
  const sliderFor = (label: string): HTMLInputElement => {
    const slider = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!slider) throw new Error(`No slider "${label}"`);
    return slider;
  };
  const moveSlider = async (label: string, value: number) => {
    const slider = sliderFor(label);
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  };
  return { fixture, host, settings, log, settle, buttonNamed, sliderFor, moveSlider };
}

describe('matchingPreset', () => {
  it('finds the preset whose delays are exactly the given ones, and none otherwise', () => {
    for (const preset of LATENCY_PRESETS) {
      expect(matchingPreset(preset.delays)?.id).toBe(preset.id);
    }
    expect(matchingPreset({ profile: 0, summary: 0, records: 0, admin: 1 })).toBeUndefined();
  });

  it('keeps "Staggered" the reverse of the page order, so panels finish in reverse', () => {
    const staggered = LATENCY_PRESETS.find((preset) => preset.id === 'staggered')?.delays;

    expect(staggered?.profile).toBeGreaterThan(staggered?.summary ?? Infinity);
    expect(staggered?.summary).toBeGreaterThan(staggered?.records ?? Infinity);
  });
});

describe('LatencyLabPanel', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  describe('loading strategy', () => {
    it('shows the current strategy, and choosing one writes it to the store without reloading', async () => {
      const { host, settings, settle } = await render();
      const radios = () => [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
      expect(radios().map((radio) => radio.checked)).toEqual([true, false, false]);

      radios()[1]?.click();
      await settle();

      expect(settings.strategy()).toBe('all-at-once');
      expect(settings.reloadRequested()).toBe(0);
      expect(radios().map((radio) => radio.checked)).toEqual([false, true, false]);
    });
  });

  describe('presets', () => {
    it('sets the sliders, and the chosen preset looks chosen', async () => {
      const { settings, buttonNamed, settle } = await render();

      buttonNamed('Realistic')?.click();
      await settle();

      expect(settings.delays()).toEqual({ profile: 300, summary: 900, records: 1_600, admin: 500 });
      expect(buttonNamed('Realistic')?.getAttribute('aria-pressed')).toBe('true');
      expect(buttonNamed('Instant')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('un-chooses the preset as soon as a slider is moved off it', async () => {
      const { buttonNamed, moveSlider, settle } = await render();
      buttonNamed('Realistic')?.click();
      await settle();

      await moveSlider('Summary delay in milliseconds', 1_000);

      expect(buttonNamed('Realistic')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('starts on "Instant", because that is what no delay is', async () => {
      const { buttonNamed } = await render();

      expect(buttonNamed('Instant')?.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('delays', () => {
    it('writes each slider to its own group, and shows the value in milliseconds', async () => {
      const { host, settings, moveSlider } = await render();

      await moveSlider('Records delay in milliseconds', 2_500);

      expect(settings.delays()).toEqual({ profile: 0, summary: 0, records: 2_500, admin: 0 });
      expect(host.textContent).toContain('2500 ms');
    });
  });

  describe('fail the next request', () => {
    const toggle = (host: HTMLElement, name: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('mat-slide-toggle button')].find((button) =>
        button.closest('mat-slide-toggle')?.textContent.includes(name),
      );

    it('arms a failure for that group only', async () => {
      const { host, settings, settle } = await render();

      toggle(host, 'summary')?.click();
      await settle();

      expect([...settings.armedFailures()]).toEqual(['summary']);
    });

    it('turns itself off when a request takes the failure', async () => {
      const { host, settings, settle } = await render();
      toggle(host, 'records')?.click();
      await settle();
      expect(toggle(host, 'records')?.getAttribute('aria-checked')).toBe('true');

      settings.takeFailure('records');
      await settle();

      expect(toggle(host, 'records')?.getAttribute('aria-checked')).toBe('false');
    });

    it('shows a failure armed before the page loaded', async () => {
      TestBed.inject(LatencySettingsStore).armFailure('admin', true);
      const { host } = await render();

      expect(toggle(host, 'admin')?.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('client timeout', () => {
    it('writes the slider to the store, and shows it in seconds', async () => {
      const { host, settings, moveSlider } = await render();
      expect(host.textContent).toContain('12 s');

      await moveSlider('Client timeout in seconds', 5_000);

      expect(settings.timeoutMs()).toBe(5_000);
      expect(host.textContent).toContain('5 s');
    });
  });

  describe('Reload dashboard', () => {
    it('asks the dashboard to reload, once per press', async () => {
      const { settings, buttonNamed } = await render();

      buttonNamed('Reload dashboard')?.click();
      buttonNamed('Reload dashboard')?.click();

      expect(settings.reloadRequested()).toBe(2);
    });

    it('is not offered anywhere but the dashboard, where nothing would listen', async () => {
      const { buttonNamed } = await render(false);

      expect(buttonNamed('Reload dashboard')).toBeNull();
    });
  });

  describe('timeline', () => {
    it('shows the request log, and Clear empties it', async () => {
      const { host, log, buttonNamed, settle } = await render();
      const id = log.start({ group: 'records', method: 'GET', url: '/records?page=1' });
      log.finish(id, { outcome: 'ok', status: 200 });
      await settle();
      expect(host.textContent).toContain('GET /records?page=1');

      buttonNamed('Clear')?.click();
      await settle();

      expect(log.entries()).toHaveLength(0);
      expect(host.textContent).not.toContain('GET /records?page=1');
    });
  });

  it('asks to be dismissed from the close button', async () => {
    const { fixture, host } = await render();
    const closed = vi.fn();
    fixture.componentInstance.dismiss.subscribe(closed);

    host.querySelector<HTMLButtonElement>('button[aria-label="Close the latency lab"]')?.click();

    expect(closed).toHaveBeenCalledOnce();
  });
});
