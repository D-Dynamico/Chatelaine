import type { RequestTiming } from '../middleware/request-context.js';

// Typed per-request state. Express types res.locals as Record<string, any>; declaring the
// keys we use here keeps every read of them type-checked.
declare global {
  namespace Express {
    interface Locals {
      timing?: RequestTiming;
    }
  }
}

export {};
