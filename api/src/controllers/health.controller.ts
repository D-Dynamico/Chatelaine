import type { RequestHandler } from 'express';
import type { StorageKind } from '../config.js';

export interface HealthInfo {
  readonly storage: StorageKind;
  readonly version: string;
}

/** Reports liveness for Render's health check and the SPA's boot wake-up (docs/API.md §10). */
export function healthController(info: HealthInfo): RequestHandler {
  return (req, res) => {
    // TEMPORARY, Stage 7 (docs/sessions/2026-10-10-stage7.md, decision 5): confirms that
    // TRUST_PROXY=1 makes req.ip the real client address behind Render. Remove after the check.
    req.log.info(
      { ip: req.ip, ips: req.ips, forwardedFor: req.get('x-forwarded-for') },
      'client ip check',
    );
    res.json({
      status: 'ok',
      storage: info.storage,
      uptimeSeconds: Math.floor(process.uptime()),
      version: info.version,
    });
  };
}
