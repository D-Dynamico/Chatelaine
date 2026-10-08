import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_API_BASE } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { apiUrlInterceptor } from './api-url-interceptor';

describe('apiUrlInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestHttp([apiUrlInterceptor]) });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('resolves api/ paths against the configured base, keeping the query', () => {
    client.get('api/records', { params: { page: 2 } }).subscribe();

    const request = http.expectOne(`${TEST_API_BASE}/records?page=2`);
    expect(request.request.url).toBe(`${TEST_API_BASE}/records`);
    request.flush({});
  });

  it('leaves any other URL alone', () => {
    client.get('https://elsewhere.test/api/records').subscribe();
    client.get('apiary/hives').subscribe();

    http.expectOne('https://elsewhere.test/api/records').flush({});
    http.expectOne('apiary/hives').flush({});
  });
});
