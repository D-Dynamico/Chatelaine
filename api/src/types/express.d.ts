import type { z } from 'zod';
import type { AuthContext } from '../middleware/authenticate.js';
import type { RequestTiming } from '../middleware/request-context.js';

// Typed per-request state. Express types res.locals as Record<string, any>; declaring the
// keys we use here keeps every read of them type-checked.
declare global {
  namespace Express {
    interface Locals {
      timing?: RequestTiming;
      /** Written only by validate(), read only through readValidated(). */
      validated?: Map<z.ZodType, unknown>;
    }
    interface Request {
      /** Set by authenticate; read through currentUser(). */
      auth?: AuthContext;
    }
  }
}

export {};
