import { Router } from 'express';
import {
  listRecordsController,
  recordsSummaryController,
} from '../controllers/records.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { recordsQuery } from '../schemas/records.schema.js';
import type { AuthService } from '../services/auth.service.js';
import type { RecordService } from '../services/record.service.js';

/** Authentication runs before validation, so an anonymous caller gets 401, never a 400. */
export function recordsRoutes(auth: AuthService, records: RecordService): Router {
  return Router()
    .get('/records/summary', authenticate(auth), recordsSummaryController(records))
    .get(
      '/records',
      authenticate(auth),
      validate('query', recordsQuery),
      listRecordsController(records),
    );
}
