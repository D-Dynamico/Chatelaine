import { type EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BootSequence } from './boot-sequence';

/**
 * Holds the first render until the server answered and any stored session is restored, so
 * a signed-in user never sees the login page flash (§16). The sequence never errors, and
 * a rejected initializer would leave a blank page, so this always resolves.
 */
export function provideBoot(): EnvironmentProviders {
  return provideAppInitializer(() => firstValueFrom(inject(BootSequence).run()));
}
