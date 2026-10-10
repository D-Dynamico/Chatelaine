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
    // TRUST_PROXY=3 makes req.ip the real client address behind Render. Render's own health
    // checks carry no X-Forwarded-For, so only requests that came through its front proxy
    // are logged. The answer is in the message itself. Remove after the check.
    const forwardedFor = req.get('x-forwarded-for');
    if (forwardedFor !== undefined) {
      req.log.warn(
        `client ip check: ip=${req.ip ?? 'none'} ips=[${req.ips.join(', ')}] x-forwarded-for=${forwardedFor}`,
      );
    }
    res.json({
      status: 'ok',
      storage: info.storage,
      uptimeSeconds: Math.floor(process.uptime()),
      version: info.version,
    });
  };
}
