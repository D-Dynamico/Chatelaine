import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageTitleStrategy } from './page-title-strategy';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class Blank {}

describe('PageTitleStrategy', () => {
  it('appends the app name to the route title, or shows the name alone', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Blank, title: 'Sign in' },
          { path: 'untitled', component: Blank },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
    const title = TestBed.inject(Title);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');
    expect(title.getTitle()).toBe('Sign in | Chatelaine');

    await harness.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('Chatelaine');
  });
});
