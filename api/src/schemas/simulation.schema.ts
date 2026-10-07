import { z } from 'zod';
import { DELAY_MAX_MS } from '../domain/limits.js';

const DELAY_MESSAGE = `delay must be a whole number of milliseconds from 0 to ${String(DELAY_MAX_MS)}`;
const FAIL_MESSAGE = 'fail must be true when it is sent';

/**
 * The simulation parameters (docs/API.md §9). Digits only, so "-1", "1.5", "1e3" and an
 * empty value are rejected rather than coerced. Other query keys pass through untouched;
 * each route validates its own.
 */
export const simulationQuery = z.object({
  delay: z
    .string({ error: DELAY_MESSAGE })
    .regex(/^\d{1,5}$/, DELAY_MESSAGE)
    .transform(Number)
    .pipe(z.number().max(DELAY_MAX_MS, DELAY_MESSAGE))
    .optional(),
  fail: z.literal('true', { error: FAIL_MESSAGE }).optional(),
});

export const SIMULATION_PARAMS = ['delay', 'fail'] as const;
