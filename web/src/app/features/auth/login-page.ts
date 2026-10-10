import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session-store';
import { ApiError } from '../../core/http/api-error';
import { BootSequence } from '../../core/init/boot-sequence';
import { BootStatus } from '../../core/init/boot-status';
import { type Role } from '../../core/models/user';
import { safeReturnUrl } from '../../core/routing/return-url';
import { BrandMark } from '../../shared/ui/brand-mark';
import { DEMO_PASSWORD, type DemoAccount, DemoAccounts } from './demo-accounts';
import { ServerLine } from './server-line';

export const LOGIN_MESSAGES = {
  invalidCredentials: "That user ID, password and role don't match an active account.",
  sessionExpired: 'Your session ended. Sign in again.',
} as const;

export const ROLE_OPTIONS: readonly { value: Role; label: string; hint: string }[] = [
  { value: 'GENERAL', label: 'General User', hint: 'See and track your own requests' },
  { value: 'ADMIN', label: 'Admin', hint: 'Manage users and see every request' },
];

/** Never says which of user ID, password or role was wrong; the API does not either (§10). */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return LOGIN_MESSAGES.invalidCredentials;
  return error.code === 'INVALID_CREDENTIALS' ? LOGIN_MESSAGES.invalidCredentials : error.message;
}

@Component({
  selector: 'app-login-page',
  imports: [
    BrandMark,
    DemoAccounts,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    ServerLine,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly boot = inject(BootSequence);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly server = inject(BootStatus).server;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly messages = LOGIN_MESSAGES;
  protected readonly form = inject(NonNullableFormBuilder).group({
    userId: ['', Validators.required],
    password: ['', Validators.required],
    role: ['GENERAL' as Role, Validators.required],
  });

  protected readonly isSubmitting = signal(false);
  protected readonly isRetrying = signal(false);
  protected readonly isPasswordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Which demo tag reads as chosen: the one whose user ID is in the box right now. */
  protected readonly userId = toSignal(this.form.controls.userId.valueChanges, {
    initialValue: '',
  });
  protected readonly isExpired = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('reason') === 'expired')),
    { initialValue: false },
  );

  // `read: ElementRef`: on a Material button the plain reference is the component.
  private readonly submitButton = viewChild<string, ElementRef<HTMLButtonElement>>('submitButton', {
    read: ElementRef,
  });

  /** The form is complete after a pick, so focus waits on "Sign in": Enter signs in. */
  protected fillFrom(account: DemoAccount): void {
    this.form.setValue({ userId: account.userId, password: DEMO_PASSWORD, role: account.role });
    this.errorMessage.set(null);
    this.submitButton()?.nativeElement.focus();
  }

  protected submit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { userId, password, role } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.auth
      .login({ userId: userId.trim().toLowerCase(), password, role })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.goOn(),
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(messageFor(error));
        },
      });
  }

  /** Re-runs the boot steps; a stored session that now restores goes straight on. */
  protected retryServer(): void {
    this.isRetrying.set(true);
    this.boot
      .run()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isRetrying.set(false);
        if (this.session.isSignedIn()) void this.goOn();
      });
  }

  private goOn(): Promise<boolean> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return this.router.navigateByUrl(safeReturnUrl(returnUrl));
  }
}
