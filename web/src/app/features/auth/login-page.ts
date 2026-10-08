import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Filled in by the login form in 3.9. */
@Component({
  selector: 'app-login-page',
  template: '<h1 class="page-title">Sign in</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
