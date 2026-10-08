import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The users table arrives in Stage 5; this page exists now so the admin chunk does. */
@Component({
  selector: 'app-users-page',
  template: '<h1 class="page-title">Users</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {}
