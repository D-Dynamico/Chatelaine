import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type ServerState } from '../../core/init/boot-status';

/** What the boot health check found (§23), with "Try again" when the server is silent. */
@Component({
  selector: 'app-server-line',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <p class="line" role="status">
      @switch (state().status) {
        @case ('awake') {
          <span class="tabular">Server awake, responded in {{ latencyMs() }} ms</span>
        }
        @case ('unreachable') {
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          <span>The server is not responding.</span>
        }
        @default {
          <span>Connecting to the server</span>
        }
      }
    </p>
    @if (state().status === 'unreachable') {
      <button mat-stroked-button type="button" [disabled]="isRetrying()" (click)="retry.emit()">
        <mat-icon>refresh</mat-icon>
        Try again
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .line {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0;
      color: var(--ink-muted);
      font: var(--type-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerLine {
  readonly state = input.required<ServerState>();
  readonly isRetrying = input(false);
  readonly retry = output();

  protected readonly latencyMs = computed(() => {
    const state = this.state();
    return state.status === 'awake' ? state.latencyMs : null;
  });
}
