import { Injectable, inject } from '@angular/core';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { SESSION_STORAGE } from '../storage/web-storage';

/** The token lives in sessionStorage, so it does not outlive the tab (D9). */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly storage = inject(SESSION_STORAGE);

  read(): string | null {
    return this.storage.read(STORAGE_KEYS.token);
  }

  write(token: string): void {
    this.storage.write(STORAGE_KEYS.token, token);
  }

  clear(): void {
    this.storage.remove(STORAGE_KEYS.token);
  }
}
