import type { RequestHandler } from 'express';
import { readValidated } from '../middleware/validate.js';
import { userIdParam, usersQuery } from '../schemas/admin-users.schema.js';
import type { UserService } from '../services/user.service.js';

export function listUsersController(users: UserService): RequestHandler {
  return async (_req, res) => {
    res.json(await users.list(readValidated(res, usersQuery)));
  };
}

export function getUserController(users: UserService): RequestHandler {
  return async (_req, res) => {
    res.json(await users.get(readValidated(res, userIdParam).userId));
  };
}
