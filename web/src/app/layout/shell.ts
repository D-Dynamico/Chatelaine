import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { SessionStore } from '../core/auth/session-store';
import { RequestLogStore } from '../core/latency/request-log-store';
import { NoticeStore } from '../core/notices/notice-store';
import { APP_PATHS } from '../core/routing/app-paths';
import { ThemeService } from '../core/theme/theme.service';
import { AccountMenu } from './account-menu';
import { ThemeMenu } from './theme-menu';

export const SIGNED_OUT_MESSAGE = 'Signed out';

/**
 * The signed-in frame (§23): the role keyline, the top bar and the page outlet. It is the
 * container for its menus, which only take inputs and emit events.
 */
@Component({
  selector: 'app-shell',
  imports: [
    AccountMenu,
    MatProgressBarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeMenu,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: { '[class.admin]': 'session.isAdmin()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly session = inject(SessionStore);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly requestLog = inject(RequestLogStore);

  protected readonly paths = APP_PATHS;
  protected readonly isLoading = computed(() =>
    this.requestLog.entries().some((entry) => entry.outcome === 'pending'),
  );

  constructor() {
    // Shows messages posted by eager code, such as the role guard's refusal.
    const notices = inject(NoticeStore);
    effect(() => {
      if (notices.pending().length === 0) return;
      const message = untracked(() => notices.take());
      if (message) this.snackBar.open(message, undefined, { duration: 5_000 });
    });
  }

  protected async signOut(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl(APP_PATHS.login);
    this.snackBar.open(SIGNED_OUT_MESSAGE, undefined, { duration: 4_000 });
  }
}
