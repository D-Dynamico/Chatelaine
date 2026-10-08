import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { SESSION_STORAGE } from '../storage/web-storage';
import { type SimulatedGroup } from './endpoint-group';
import {
  DELAY_LIMITS,
  type LatencySettings,
  type LoadingStrategy,
  TIMEOUT_LIMITS,
  isWithin,
  parseSettings,
} from './latency-settings';

function readJson(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Settings the latency lab edits and the HTTP chain reads (§15, §19). Everything, armed
 * failures included, survives a reload in the same tab: an armed failure stays armed until
 * a request in its group takes it, so arming one and reloading fails exactly that load.
 */
@Injectable({ providedIn: 'root' })
export class LatencySettingsStore {
  private readonly storage = inject(SESSION_STORAGE);
  private readonly settings = signal<LatencySettings>(
    parseSettings(readJson(this.storage.read(STORAGE_KEYS.latency))),
  );
  private readonly reloads = signal(0);

  readonly delays = computed(() => this.settings().delays);
  readonly strategy = computed(() => this.settings().strategy);
  readonly timeoutMs = computed(() => this.settings().timeoutMs);
  readonly armedFailures = computed<ReadonlySet<SimulatedGroup>>(
    () => new Set(this.settings().armedFailures),
  );
  /** Bumped by the lab's "Reload dashboard"; the dashboard reacts to it (D34). */
  readonly reloadRequested = this.reloads.asReadonly();

  setDelay(group: SimulatedGroup, delayMs: number): void {
    if (!isWithin(delayMs, DELAY_LIMITS)) {
      throw new RangeError(`Delay out of range: ${String(delayMs)}`);
    }
    this.update((current) => ({ ...current, delays: { ...current.delays, [group]: delayMs } }));
  }

  setStrategy(strategy: LoadingStrategy): void {
    this.update((current) => ({ ...current, strategy }));
  }

  setTimeoutMs(timeoutMs: number): void {
    if (!isWithin(timeoutMs, TIMEOUT_LIMITS)) {
      throw new RangeError(`Timeout out of range: ${String(timeoutMs)}`);
    }
    this.update((current) => ({ ...current, timeoutMs }));
  }

  armFailure(group: SimulatedGroup, isArmed: boolean): void {
    this.update((current) => {
      const others = current.armedFailures.filter((armed) => armed !== group);
      return { ...current, armedFailures: isArmed ? [...others, group] : others };
    });
  }

  /** True once per arming: the request that reads it carries `fail=true`, later ones do not. */
  takeFailure(group: SimulatedGroup): boolean {
    if (!this.armedFailures().has(group)) return false;
    this.armFailure(group, false);
    return true;
  }

  requestReload(): void {
    this.reloads.update((count) => count + 1);
  }

  /**
   * Saves on every change rather than from an effect. An effect writes later, so a flag
   * taken just before the page unloads could stay saved and fail the next load as well.
   */
  private update(change: (current: LatencySettings) => LatencySettings): void {
    this.settings.update(change);
    this.storage.write(STORAGE_KEYS.latency, JSON.stringify(this.settings()));
  }
}
