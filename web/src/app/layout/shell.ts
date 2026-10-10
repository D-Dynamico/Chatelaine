import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { SessionStore } from '../core/auth/session-store';
import { RequestLogStore } from '../core/latency/request-log-store';
import { NoticeStore } from '../core/notices/notice-store';
import { APP_PATHS } from '../core/routing/app-paths';
import { ThemeService } from '../core/theme/theme.service';
import { LatencyLabPanel } from '../features/latency-lab/latency-lab-panel';
import { BrandMark } from '../shared/ui/brand-mark';
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
    BrandMark,
    LatencyLabPanel,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeMenu,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: { '[class.admin]': 'session.isAdmin()', '[class.lab-open]': 'isLabOpen()' },
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

  protected readonly isLabOpen = signal(false);
  protected readonly pendingCount = computed(
    () => this.requestLog.entries().filter((entry) => entry.outcome === 'pending').length,
  );
  protected readonly timelineLabel = computed(() => {
    const count = this.pendingCount();
    if (count === 0) return 'Timeline';
    return `Timeline, ${String(count)} ${count === 1 ? 'request' : 'requests'} in flight`;
  });

  /** "Reload dashboard" does nothing anywhere else, so the lab only offers it here. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly isOnDashboard = computed(
    () => this.currentUrl().split(/[?#]/)[0] === APP_PATHS.dashboard,
  );

  // `read: ElementRef`: on a Material button the plain reference is the component, not the DOM.
  private readonly timelineButton = viewChild<string, ElementRef<HTMLButtonElement>>(
    'timelineButton',
    { read: ElementRef },
  );
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

  constructor() {
    // Shows messages posted by eager code, such as the role guard's refusal.
    const notices = inject(NoticeStore);
    effect(() => {
      if (notices.pending().length === 0) return;
      const message = untracked(() => notices.take());
      if (message) this.snackBar.open(message, undefined, { duration: 5_000 });
    });

    // The drawer does not trap focus, but it takes it when it opens, so a keyboard user
    // lands in it rather than having to find it (§26).
    effect(() => {
      this.drawer()?.nativeElement.focus();
    });
  }

  protected toggleLab(): void {
    this.isLabOpen.update((isOpen) => !isOpen);
  }

  /** Closing from inside the drawer returns focus to the button that opened it. */
  protected closeLab(): void {
    this.isLabOpen.set(false);
    this.timelineButton()?.nativeElement.focus();
  }

  protected async signOut(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl(APP_PATHS.login);
    this.snackBar.open(SIGNED_OUT_MESSAGE, undefined, { duration: 4_000 });
  }
}
