import type { RequestHandler } from 'express';
import type { StorageKind } from '../config.js';

export interface HealthInfo {
  readonly storage: StorageKind;
  readonly version: string;
}

/** Reports liveness for Render's health check and the SPA's boot wake-up (docs/API.md §10). */
export function healthController(info: HealthInfo): RequestHandler {
  return (_req, res) => {
    res.json({
      status: 'ok',
      storage: info.storage,
      uptimeSeconds: Math.floor(process.uptime()),
      version: info.version,
    });
  };
}
