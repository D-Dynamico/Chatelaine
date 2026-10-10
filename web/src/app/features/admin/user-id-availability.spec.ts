import { RIYA, errorBody } from '../../testing/fixtures';
import { AVAILABILITY_DEBOUNCE_MS } from './user-id-availability';
import { USER_ID_HINTS } from './user-form-dialog';
import { USERS, fillNewUser, openDialog } from '../../testing/user-form-dialog-harness';

describe('The userId availability check', () => {
  beforeEach(() => {
    // The availability debounce runs on rxjs timers (setInterval) and measures with Date.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('asks once, 400 ms after typing stops, and reads 404 as available', async () => {
    const dialog = await openDialog({ mode: 'create' });

    for (const text of ['n', 'ne', 'neh', 'neha']) {
      await dialog.type('userId', text);
      await vi.advanceTimersByTimeAsync(100);
    }
    dialog.http.expectNone((req) => req.url.startsWith(`${USERS}/`));
    expect(dialog.text()).toContain(USER_ID_HINTS.checking);

    await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
    dialog
      .lookup('neha')
      .flush(errorBody('USER_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    await dialog.settle();

    expect(dialog.text()).toContain(USER_ID_HINTS.available);
  });

  it('cancels a check still in flight when the userId changes', async () => {
    const dialog = await openDialog({ mode: 'create' });
    await dialog.type('userId', 'neha');
    await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
    const first = dialog.lookup('neha');

    await dialog.type('userId', 'neha.i');

    expect(first.cancelled).toBe(true);
  });

  it('reads a found user (200) as "Already taken", and blocks submit', async () => {
    const dialog = await openDialog({ mode: 'create' });
    await dialog.type('userId', 'riya');
    await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);

    dialog.lookup('riya').flush({ ...RIYA, recordCount: 17 });
    await dialog.settle();

    expect(dialog.text()).toContain('Already taken');
    expect(dialog.text()).not.toContain(USER_ID_HINTS.available);
    expect(dialog.submitButton().disabled).toBe(true);
  });

  it('says it could not check after a 503, without blocking submit', async () => {
    const dialog = await openDialog({ mode: 'create' });
    await fillNewUser(dialog);
    await dialog.type('userId', 'neha.i');
    await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);

    dialog
      .lookup('neha.i')
      .flush(errorBody('SIMULATED_FAILURE'), { status: 503, statusText: 'Unavailable' });
    await dialog.settle();

    expect(dialog.text()).toContain(USER_ID_HINTS.unchecked);
    expect(dialog.text()).not.toContain('Already taken');
    expect(dialog.submitButton().disabled).toBe(false);
  });

  it('says it could not check after a client timeout, without blocking submit', async () => {
    const dialog = await openDialog({ mode: 'create' });
    await fillNewUser(dialog);
    await dialog.type('userId', 'neha.i');
    await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
    dialog.lookup('neha.i');

    await vi.advanceTimersByTimeAsync(60_000);
    await dialog.settle();

    expect(dialog.text()).toContain(USER_ID_HINTS.unchecked);
    expect(dialog.submitButton().disabled).toBe(false);
  });
});
