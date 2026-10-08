import { ChangeDetectionStrategy, Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BOOT_SPLASH_ELEMENT_ID, provideBootSplash } from './boot-splash';

@Component({ template: 'page', changeDetection: ChangeDetectionStrategy.OnPush })
class Page {}

describe('provideBootSplash', () => {
  let splash: HTMLElement;
  let resolvePage: (page: typeof Page) => void;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', redirectTo: 'slow' },
          {
            path: 'slow',
            loadComponent: () => new Promise<typeof Page>((resolve) => (resolvePage = resolve)),
          },
        ]),
        provideBootSplash(),
      ],
    });
    const document = TestBed.inject(DOCUMENT);
    splash = document.createElement('div');
    splash.id = BOOT_SPLASH_ELEMENT_ID;
    document.body.append(splash);
  });

  afterEach(() => {
    splash.remove();
  });

  it('stays through a redirect and the lazy load, and goes once the page is shown', async () => {
    await RouterTestingHarness.create();
    const navigation = TestBed.inject(Router).navigateByUrl('/');

    await new Promise((resolve) => setTimeout(resolve));
    expect(splash.isConnected).toBe(true);

    resolvePage(Page);
    await navigation;
    expect(splash.isConnected).toBe(false);
  });
});
