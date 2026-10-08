import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { API_INTERCEPTORS } from './core/http/api-interceptors';
import { provideBoot } from './core/init/app-initializer';
import { provideBootSplash } from './core/init/boot-splash';
import { PageTitleStrategy } from './core/routing/page-title-strategy';
import { provideTheme } from './core/theme/provide-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Default (non-blocking) initial navigation on purpose: it starts only after the boot
    // initializer has restored the session, so the guards see the real session (§16).
    provideRouter(routes),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideHttpClient(withInterceptors([...API_INTERCEPTORS])),
    provideTheme(),
    provideBoot(),
    provideBootSplash(),
  ],
};
