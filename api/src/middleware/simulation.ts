import { setTimeout as sleep } from 'node:timers/promises';
import type { RequestHandler } from 'express';
import { SimulatedFailureError, SimulationDisabledError } from '../domain/errors.js';
import { SIMULATION_PARAMS, simulationQuery } from '../schemas/simulation.schema.js';
import { recordSimulatedDelay } from './request-context.js';
import { parseOrThrow } from './validate.js';

function mentionsSimulation(query: object): boolean {
  return SIMULATION_PARAMS.some((param) => Object.hasOwn(query, param));
}

/**
 * Applies ?delay= and ?fail= (docs/API.md §9). It runs before authentication, so a delayed
 * request with a bad token still waits, and the timeline shows where the time went.
 * /health is mounted ahead of this middleware and never reaches it.
 */
export function simulation(options: { readonly enabled: boolean }): RequestHandler {
  return async (req, res, next) => {
    const query: object = req.query;
    if (!options.enabled) {
      if (mentionsSimulation(query)) throw new SimulationDisabledError();
      next();
      return;
    }

    const { delay, fail } = parseOrThrow(simulationQuery, query);
    if (delay !== undefined) {
      recordSimulatedDelay(res, delay);
      await sleep(delay);
    }
    if (fail) throw new SimulatedFailureError();
    next();
  };
}
