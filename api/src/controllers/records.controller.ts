import type { RequestHandler } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { readValidated } from '../middleware/validate.js';
import { recordsQuery } from '../schemas/records.schema.js';
import type { RecordService } from '../services/record.service.js';

export function listRecordsController(records: RecordService): RequestHandler {
  return async (req, res) => {
    res.json(await records.list(currentUser(req), readValidated(res, recordsQuery)));
  };
}

export function recordsSummaryController(records: RecordService): RequestHandler {
  return async (req, res) => {
    res.json(await records.summary(currentUser(req)));
  };
}
