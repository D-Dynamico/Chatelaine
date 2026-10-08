import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RIYA, TEST_API_BASE } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { UserService } from './user.service';

describe('UserService', () => {
  it('reads the signed-in user from /me', async () => {
    TestBed.configureTestingModule({ providers: [...provideTestHttp(), provideRouter([])] });
    const http = TestBed.inject(HttpTestingController);

    const profile = firstValueFrom(TestBed.inject(UserService).getProfile());
    http.expectOne(`${TEST_API_BASE}/me`).flush(RIYA);

    await expect(profile).resolves.toEqual(RIYA);
    http.verify();
  });
});
