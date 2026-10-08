import { Injectable, computed, effect, inject, signal } from '@angular/core';
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
 * Settings the latency lab edits and the HTTP chain reads (§15, §19). Delays, strategy and
 * timeout survive a reload in the same tab. Fail-next flags do not: each is a one-shot,
 * and a reload is not the request it was armed for.
 */
@Injectable({ providedIn: 'root' })
export class LatencySettingsStore {
  private readonly storage = inject(SESSION_STORAGE);
  private readonly settings = signal<LatencySettings>(
    parseSettings(readJson(this.storage.read(STORAGE_KEYS.latency))),
  );
  private readonly armed = signal<ReadonlySet<SimulatedGroup>>(new Set());
  private readonly reloads = signal(0);

  readonly delays = computed(() => this.settings().delays);
  readonly strategy = computed(() => this.settings().strategy);
  readonly timeoutMs = computed(() => this.settings().timeoutMs);
  readonly armedFailures = this.armed.asReadonly();
  /** Bumped by the lab's "Reload dashboard"; the dashboard reacts to it (D34). */
  readonly reloadRequested = this.reloads.asReadonly();

  constructor() {
    effect(() => {
      this.storage.write(STORAGE_KEYS.latency, JSON.stringify(this.settings()));
    });
  }

  setDelay(group: SimulatedGroup, delayMs: number): void {
    if (!isWithin(delayMs, DELAY_LIMITS))
      throw new RangeError(`Delay out of range: ${String(delayMs)}`);
    this.settings.update((current) => ({
      ...current,
      delays: { ...current.delays, [group]: delayMs },
    }));
  }

  setStrategy(strategy: LoadingStrategy): void {
    this.settings.update((current) => ({ ...current, strategy }));
  }

  setTimeoutMs(timeoutMs: number): void {
    if (!isWithin(timeoutMs, TIMEOUT_LIMITS)) {
      throw new RangeError(`Timeout out of range: ${String(timeoutMs)}`);
    }
    this.settings.update((current) => ({ ...current, timeoutMs }));
  }

  armFailure(group: SimulatedGroup, isArmed: boolean): void {
    this.armed.update((current) => {
      const next = new Set(current);
      if (isArmed) next.add(group);
      else next.delete(group);
      return next;
    });
  }

  /** True once per arming: the request that reads it carries `fail=true`, later ones do not. */
  takeFailure(group: SimulatedGroup): boolean {
    if (!this.armed().has(group)) return false;
    this.armFailure(group, false);
    return true;
  }

  requestReload(): void {
    this.reloads.update((count) => count + 1);
  }
}
