import { TestBed } from '@angular/core/testing';
import { MEERA, RIYA } from '../../testing/fixtures';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { SessionStore } from './session-store';

describe('SessionStore', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('is signed in only with both a token and a user', () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    const session = TestBed.inject(SessionStore);

    expect(session.token()).toBe('jwt');
    expect(session.isSignedIn()).toBe(false);
    session.restore(RIYA);
    expect(session.isSignedIn()).toBe(true);
  });

  it('derives isAdmin from the user role', () => {
    const session = TestBed.inject(SessionStore);

    session.start('jwt', RIYA);
    expect(session.isAdmin()).toBe(false);
    session.start('jwt', MEERA);
    expect(session.isAdmin()).toBe(true);
  });

  it('persists the token on start and removes it on clear', () => {
    const session = TestBed.inject(SessionStore);

    session.start('jwt', RIYA);
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('jwt');

    session.clear();
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(session.user()).toBeNull();
    expect(session.isSignedIn()).toBe(false);
  });

  it("takes a newer copy of the signed-in user's own profile", () => {
    const session = TestBed.inject(SessionStore);
    session.start('jwt', MEERA);

    session.refreshUser({ ...MEERA, displayName: 'Meera N.' });

    expect(session.user()?.displayName).toBe('Meera N.');
  });

  it("never takes another user's profile, nor one while signed out", () => {
    const session = TestBed.inject(SessionStore);

    session.refreshUser(RIYA);
    expect(session.user()).toBeNull();

    session.start('jwt', MEERA);
    session.refreshUser({ ...RIYA, role: 'ADMIN' });
    expect(session.user()).toEqual(MEERA);
  });
});
