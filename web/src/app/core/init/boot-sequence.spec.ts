import { HttpTestingController } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { SessionStore } from '../auth/session-store';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { BOOT_STATUS_ELEMENT_ID, BootStatus } from './boot-status';
import { BOOT_MESSAGES, BootSequence, WAKE_TIMING } from './boot-sequence';

const HEALTH_URL = `${TEST_API_BASE}/health`;
const ME_URL = `${TEST_API_BASE}/me`;

describe('BootSequence (the app initializer)', () => {
  let http: HttpTestingController;
  let status: BootStatus;
  let splash: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  function setUp(): void {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [...provideTestHttp(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    status = TestBed.inject(BootStatus);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const document = TestBed.inject(DOCUMENT);
    splash = document.createElement('p');
    splash.id = BOOT_STATUS_ELEMENT_ID;
    document.body.append(splash);
  }

  /** Starts the sequence and reports whether it has finished, without awaiting it. */
  function start(): { isDone: () => boolean; result: Promise<unknown> } {
    let isDone = false;
    const result = new Promise((resolve, reject) => {
      TestBed.inject(BootSequence)
        .run()
        .subscribe({
          complete: () => {
            isDone = true;
            resolve(isDone);
          },
          error: reject,
        });
    });
    return { isDone: () => isDone, result };
  }

  function healthy(): void {
    http.expectOne(HEALTH_URL).flush({ status: 'ok' });
  }

  afterEach(() => {
    splash.remove();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('resolves, unreachable, when health never answers within 90 s', async () => {
    setUp();
    const boot = start();

    for (let elapsed = 0; !boot.isDone(); elapsed += WAKE_TIMING.retryEveryMs) {
      expect(elapsed).toBeLessThanOrEqual(WAKE_TIMING.giveUpAfterMs);
      http.expectOne(HEALTH_URL).error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(WAKE_TIMING.retryEveryMs);
    }

    await expect(boot.result).resolves.toBe(true);
    expect(status.server()).toEqual({ status: 'unreachable' });
    http.expectNone(ME_URL);
  });

  it('retries a hung health check after its own 5 s timeout', async () => {
    setUp();
    const boot = start();

    http.expectOne(HEALTH_URL);
    await vi.advanceTimersByTimeAsync(WAKE_TIMING.attemptTimeoutMs + WAKE_TIMING.retryEveryMs);
    healthy();
    await vi.advanceTimersByTimeAsync(0);

    expect(boot.isDone()).toBe(true);
    expect(status.server()).toMatchObject({ status: 'awake' });
  });

  it('says the server is waking after 4 s, counting the seconds', async () => {
    setUp();
    start();
    expect(splash.textContent).toBe(BOOT_MESSAGES.connecting);

    http.expectOne(HEALTH_URL).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(WAKE_TIMING.wakingMessageAfterMs);

    expect(splash.textContent).toBe(BOOT_MESSAGES.waking(4));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(splash.textContent).toBe(BOOT_MESSAGES.waking(6));
    http.expectOne(HEALTH_URL).flush({ status: 'ok' });
  });

  it('restores a stored session once the server is awake', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    setUp();
    const boot = start();

    healthy();
    http.expectOne(ME_URL).flush(RIYA);

    await expect(boot.result).resolves.toBe(true);
    expect(TestBed.inject(SessionStore).isSignedIn()).toBe(true);
  });

  it('clears a rejected token without navigating, and still resolves', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'stale');
    setUp();
    const boot = start();

    healthy();
    http
      .expectOne(ME_URL)
      .flush(errorBody('SESSION_INVALID'), { status: 401, statusText: 'Unauthorized' });

    await expect(boot.result).resolves.toBe(true);
    expect(TestBed.inject(SessionStore).token()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('never throws, even when restoring fails unexpectedly', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    setUp();
    vi.spyOn(TestBed.inject(SessionStore), 'restore').mockImplementation(() => {
      throw new Error('Broken store');
    });
    const boot = start();

    healthy();
    http.expectOne(ME_URL).flush(RIYA);

    await expect(boot.result).resolves.toBe(true);
  });
});
