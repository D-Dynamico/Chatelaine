import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { routes } from './app.routes';
import { API_INTERCEPTORS } from './core/http/api-interceptors';
import { provideBoot } from './core/init/app-initializer';
import { PageTitleStrategy } from './core/routing/page-title-strategy';
import { provideTheme } from './core/theme/provide-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Keeps the boot splash up until the first page's chunk has loaded (§16).
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideHttpClient(withInterceptors([...API_INTERCEPTORS])),
    provideTheme(),
    provideBoot(),
  ],
};
