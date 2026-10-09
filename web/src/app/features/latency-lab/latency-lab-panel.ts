import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { SIMULATED_GROUPS, type SimulatedGroup } from '../../core/latency/endpoint-group';
import { DELAY_LIMITS, TIMEOUT_LIMITS } from '../../core/latency/latency-settings';
import { LatencySettingsStore } from '../../core/latency/latency-settings-store';
import { RequestLogStore } from '../../core/latency/request-log-store';
import { injectAnimationClock } from './animation-clock';
import { GROUP_LABELS, LATENCY_PRESETS, type LatencyPreset, matchingPreset } from './presets';
import { RequestTimeline } from './request-timeline';
import { StrategyPicker } from './strategy-picker';

const DELAY_STEP_MS = 100;
const TIMEOUT_STEP_MS = 500;

/**
 * The latency lab (§19): everything that makes the dashboard's loading visible, and the
 * timeline that shows it. It is the container for the lab's stores. The shell hosts it in a
 * drawer and tells it whether the dashboard is open, because "Reload dashboard" does
 * nothing anywhere else.
 */
@Component({
  selector: 'app-latency-lab-panel',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSliderModule,
    RequestTimeline,
    StrategyPicker,
  ],
  templateUrl: './latency-lab-panel.html',
  styleUrl: './latency-lab-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatencyLabPanel {
  protected readonly settings = inject(LatencySettingsStore);
  private readonly log = inject(RequestLogStore);

  readonly canReloadDashboard = input.required<boolean>();
  readonly dismiss = output();

  protected readonly entries = this.log.entries;
  /** The clock runs only while a request is pending, and is off for reduced motion. */
  protected readonly now = injectAnimationClock(() =>
    this.entries().some((entry) => entry.outcome === 'pending'),
  );

  protected readonly groups = SIMULATED_GROUPS.map((group) => ({
    group,
    ...GROUP_LABELS[group],
  }));
  protected readonly presets = LATENCY_PRESETS;
  protected readonly activePreset = computed(() => matchingPreset(this.settings.delays())?.id);
  protected readonly delayLimits = { ...DELAY_LIMITS, step: DELAY_STEP_MS };
  protected readonly timeoutLimits = { ...TIMEOUT_LIMITS, step: TIMEOUT_STEP_MS };

  protected choosePreset(preset: LatencyPreset): void {
    this.settings.setDelays(preset.delays);
  }

  protected setDelay(group: SimulatedGroup, delayMs: number): void {
    this.settings.setDelay(group, delayMs);
  }

  protected clearLog(): void {
    this.log.clear();
  }

  protected formatMs(ms: number): string {
    return `${String(ms)} ms`;
  }

  protected formatSeconds(ms: number): string {
    return `${String(ms / 1_000)} s`;
  }
}
