import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { RequestLogStore } from '../core/latency/request-log-store';
import { SessionStore } from '../core/auth/session-store';
import { type UserView } from '../core/models/user';
import { MEERA, RIYA } from '../testing/fixtures';
import { SIGNED_OUT_MESSAGE, Shell } from './shell';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class Blank {}

async function renderShellFor(user: UserView) {
  TestBed.configureTestingModule({
    imports: [Shell],
    providers: [provideRouter([{ path: '**', component: Blank }])],
  });
  TestBed.inject(SessionStore).start('jwt', user);
  const fixture = TestBed.createComponent(Shell);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const navLabels = (): string[] =>
    [...host.querySelectorAll('nav a')].map((link) => link.textContent.trim());
  return { fixture, host, navLabels };
}

describe('Shell', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('shows a General User the dashboard link only, under a verdigris keyline', async () => {
    const { host, navLabels } = await renderShellFor(RIYA);

    expect(navLabels()).toEqual(['Dashboard']);
    expect(host.classList).not.toContain('admin');
  });

  it('shows an Admin the Users link too, under a brass keyline', async () => {
    const { host, navLabels } = await renderShellFor(MEERA);

    expect(navLabels()).toEqual(['Dashboard', 'Users']);
    expect(host.classList).toContain('admin');
  });

  it('labels the account button with the signed-in user', async () => {
    const { host } = await renderShellFor(RIYA);

    const avatar = host.querySelector('.avatar');
    expect(avatar?.textContent.trim()).toBe('RS');
    expect(avatar?.getAttribute('aria-label')).toBe('Account: Riya Sharma');
  });

  it('shows the progress line only while a request is pending', async () => {
    const { fixture, host } = await renderShellFor(RIYA);
    const log = TestBed.inject(RequestLogStore);

    const id = log.start({ group: 'records', method: 'GET', url: '/records' });
    await fixture.whenStable();
    expect(host.querySelector('mat-progress-bar')).not.toBeNull();

    log.finish(id, { outcome: 'ok', status: 200 });
    await fixture.whenStable();
    expect(host.querySelector('mat-progress-bar')).toBeNull();
  });

  it('signs out to the login page with a confirmation', async () => {
    const { host } = await renderShellFor(RIYA);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    const snackBar = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    host.querySelector<HTMLButtonElement>('.avatar')?.click();
    const signOut = [...document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]')].find(
      (item) => item.textContent.includes('Sign out'),
    );
    signOut?.click();
    await vi.waitFor(() => {
      expect(snackBar).toHaveBeenCalledWith(SIGNED_OUT_MESSAGE, undefined, expect.anything());
    });

    expect(TestBed.inject(SessionStore).isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  describe('latency lab drawer', () => {
    const timelineButton = (host: HTMLElement) =>
      host.querySelector<HTMLButtonElement>('button[aria-controls="latency-lab"]');
    const drawer = () => document.querySelector<HTMLElement>('aside#latency-lab');
    const panelRendered = () =>
      vi.waitFor(() => {
        expect(drawer()?.querySelector('app-latency-lab-panel')).not.toBeNull();
      });
    const open = async (fixture: { whenStable: () => Promise<unknown> }, host: HTMLElement) => {
      timelineButton(host)?.click();
      await fixture.whenStable();
      await panelRendered();
    };

    it('is closed until the Timeline button is pressed, for both roles', async () => {
      for (const user of [RIYA, MEERA]) {
        TestBed.resetTestingModule();
        const { host } = await renderShellFor(user);

        expect(timelineButton(host)).not.toBeNull();
        expect(timelineButton(host)?.getAttribute('aria-expanded')).toBe('false');
        expect(drawer()).toBeNull();
      }
    });

    it('opens on the button, and says so', async () => {
      const { fixture, host } = await renderShellFor(RIYA);

      await open(fixture, host);

      expect(timelineButton(host)?.getAttribute('aria-expanded')).toBe('true');
      expect(drawer()?.getAttribute('aria-label')).toBe('Latency lab');
      expect(host.classList).toContain('lab-open');
    });

    it('moves focus into the drawer when it opens', async () => {
      const { fixture, host } = await renderShellFor(RIYA);

      await open(fixture, host);

      expect(document.activeElement).toBe(drawer());
    });

    it('closes on the button again', async () => {
      const { fixture, host } = await renderShellFor(RIYA);
      await open(fixture, host);

      timelineButton(host)?.click();
      await fixture.whenStable();

      expect(drawer()).toBeNull();
      expect(timelineButton(host)?.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on Escape from inside it, and gives focus back to the button', async () => {
      const { fixture, host } = await renderShellFor(RIYA);
      await open(fixture, host);

      drawer()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(drawer()).toBeNull();
      expect(document.activeElement).toBe(timelineButton(host));
    });

    it('closes from the close button inside the panel, and gives focus back', async () => {
      const { fixture, host } = await renderShellFor(RIYA);
      await open(fixture, host);

      drawer()
        ?.querySelector<HTMLButtonElement>('button[aria-label="Close the latency lab"]')
        ?.click();
      await fixture.whenStable();

      expect(drawer()).toBeNull();
      expect(document.activeElement).toBe(timelineButton(host));
    });

    it('counts the requests in flight on the button, and says so to screen readers', async () => {
      const { fixture, host } = await renderShellFor(RIYA);
      const log = TestBed.inject(RequestLogStore);
      expect(host.querySelector('.count')).toBeNull();
      expect(timelineButton(host)?.getAttribute('aria-label')).toBe('Timeline');

      const first = log.start({ group: 'records', method: 'GET', url: '/records' });
      log.start({ group: 'summary', method: 'GET', url: '/records/summary' });
      await fixture.whenStable();

      expect(host.querySelector('.count')?.textContent.trim()).toBe('2');
      expect(timelineButton(host)?.getAttribute('aria-label')).toBe(
        'Timeline, 2 requests in flight',
      );

      log.finish(first, { outcome: 'ok', status: 200 });
      await fixture.whenStable();
      expect(host.querySelector('.count')?.textContent.trim()).toBe('1');
      expect(timelineButton(host)?.getAttribute('aria-label')).toBe(
        'Timeline, 1 request in flight',
      );
    });

    it('offers "Reload dashboard" on the dashboard and nowhere else', async () => {
      const { fixture, host } = await renderShellFor(RIYA);
      const router = TestBed.inject(Router);
      await open(fixture, host);
      const reloadOffered = () => drawer()?.textContent.includes('Reload dashboard');

      await router.navigateByUrl('/dashboard?status=OPEN');
      await fixture.whenStable();
      expect(reloadOffered()).toBe(true);

      await router.navigateByUrl('/admin/users');
      await fixture.whenStable();
      expect(reloadOffered()).toBe(false);
    });
  });
});
