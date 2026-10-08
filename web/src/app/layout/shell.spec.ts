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
});
