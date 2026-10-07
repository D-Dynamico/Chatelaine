import { Router } from 'express';
import { healthController, type HealthInfo } from '../controllers/health.controller.js';

export function healthRoutes(info: HealthInfo): Router {
  return Router().get('/health', healthController(info));
}
