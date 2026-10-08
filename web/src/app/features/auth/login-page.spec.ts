import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BootStatus } from '../../core/init/boot-status';
import { SessionStore } from '../../core/auth/session-store';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { DEMO_PASSWORD } from './demo-accounts';
import { LOGIN_MESSAGES, LoginPage } from './login-page';

const LOGIN_URL = `${TEST_API_BASE}/auth/login`;

async function openLogin(url = '/login') {
  TestBed.configureTestingModule({
    providers: [
      ...provideTestHttp(),
      provideRouter([
        { path: 'login', component: LoginPage },
        { path: '**', children: [] },
      ]),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const page = harness.routeNativeElement;
  if (!page) throw new Error('The login page did not render');

  const input = (name: string): HTMLInputElement => {
    const element = page.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`);
    if (!element) throw new Error(`No ${name} input`);
    return element;
  };
  const type = (name: string, value: string): void => {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input'));
  };
  const submitButton = (): HTMLButtonElement => {
    const button = page.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) throw new Error('No submit button');
    return button;
  };
  const submit = async (): Promise<void> => {
    submitButton().click();
    await harness.fixture.whenStable();
  };
  const selectedRole = (): string | undefined =>
    page.querySelector('.mat-button-toggle-checked')?.textContent.trim();

  return {
    harness,
    page,
    input,
    type,
    submit,
    submitButton,
    selectedRole,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

describe('LoginPage', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('requires a user ID and a password before calling the API', async () => {
    const login = await openLogin();

    await login.submit();

    expect(login.page.textContent).toContain('Enter your user ID.');
    expect(login.page.textContent).toContain('Enter your password.');
    login.http.expectNone(LOGIN_URL);
  });

  it('signs in with the chosen role, normalising the user ID', async () => {
    const login = await openLogin('/login?returnUrl=%2Fadmin%2Fusers');
    login.type('userId', '  Riya ');
    login.type('password', 'pw');
    login.page.querySelectorAll<HTMLButtonElement>('mat-button-toggle button')[1]?.click();
    await login.harness.fixture.whenStable();
    expect(login.selectedRole()).toContain('Admin');

    await login.submit();
    const request = login.http.expectOne(LOGIN_URL);
    expect(request.request.body).toEqual({ userId: 'riya', password: 'pw', role: 'ADMIN' });
    request.flush({ token: 'jwt', expiresAt: '', user: RIYA });
    await login.harness.fixture.whenStable();

    expect(login.router.url).toBe('/admin/users');
  });

  it('fills the form from a demo key tag', async () => {
    const login = await openLogin();

    const tags = [...login.page.querySelectorAll<HTMLButtonElement>('app-demo-accounts button')];
    tags.find((tag) => tag.textContent.includes('meera.admin'))?.click();
    await login.harness.fixture.whenStable();

    expect(login.input('userId').value).toBe('meera.admin');
    expect(login.input('password').value).toBe(DEMO_PASSWORD);
    expect(login.selectedRole()).toContain('Admin');
  });

  it('shows one generic message for refused credentials', async () => {
    const login = await openLogin();
    login.type('userId', 'kabir');
    login.type('password', DEMO_PASSWORD);

    await login.submit();
    login.http
      .expectOne(LOGIN_URL)
      .flush(errorBody('INVALID_CREDENTIALS'), { status: 401, statusText: 'Unauthorized' });
    await login.harness.fixture.whenStable();

    expect(login.page.querySelector('[role="alert"]')?.textContent).toContain(
      LOGIN_MESSAGES.invalidCredentials,
    );
    expect(TestBed.inject(SessionStore).isSignedIn()).toBe(false);
  });

  it("shows the API's own message for other failures, such as the rate limit", async () => {
    const login = await openLogin();
    login.type('userId', 'riya');
    login.type('password', 'pw');

    await login.submit();
    login.http
      .expectOne(LOGIN_URL)
      .flush(errorBody('RATE_LIMITED', 'Too many sign-in attempts. Wait 15 minutes.'), {
        status: 429,
        statusText: 'Too Many Requests',
      });
    await login.harness.fixture.whenStable();

    expect(login.page.textContent).toContain('Too many sign-in attempts. Wait 15 minutes.');
  });

  it('disables submit while signing in, so it cannot be sent twice', async () => {
    const login = await openLogin();
    login.type('userId', 'riya');
    login.type('password', 'pw');

    await login.submit();

    expect(login.submitButton().disabled).toBe(true);
    login.submitButton().click();
    // A disabled button stops clicks and Enter, but not a submit event from elsewhere.
    login.page.querySelector('form')?.dispatchEvent(new Event('submit'));
    login.http.expectOne(LOGIN_URL).flush({ token: 'jwt', expiresAt: '', user: RIYA });
  });

  it('ignores an unsafe returnUrl', async () => {
    const login = await openLogin('/login?returnUrl=%2F%2Fevil.test');
    login.type('userId', 'riya');
    login.type('password', 'pw');

    await login.submit();
    login.http.expectOne(LOGIN_URL).flush({ token: 'jwt', expiresAt: '', user: RIYA });
    await login.harness.fixture.whenStable();

    expect(login.router.url).toBe('/dashboard');
  });

  it('explains an ended session', async () => {
    const login = await openLogin('/login?reason=expired');

    expect(login.page.textContent).toContain(LOGIN_MESSAGES.sessionExpired);
  });

  it('offers "Try again" when the server did not respond, and checks again', async () => {
    const login = await openLogin();
    TestBed.inject(BootStatus).set({ status: 'unreachable' });
    await login.harness.fixture.whenStable();
    expect(login.page.textContent).toContain('The server is not responding.');

    const retry = [...login.page.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Try again'),
    );
    retry?.click();
    login.http.expectOne(`${TEST_API_BASE}/health`).flush({ status: 'ok' });
    await login.harness.fixture.whenStable();

    expect(login.page.textContent).toContain('Server awake, responded in');
  });
});
