import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// A failed bootstrap surfaces as an unhandled rejection, which the browser reports with its
// full stack; the app has no logger of its own to send it to.
void bootstrapApplication(App, appConfig);
