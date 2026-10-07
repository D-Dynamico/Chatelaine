import type { RequestHandler } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { readValidated } from '../middleware/validate.js';
import {
  createUserBody,
  patchUserBody,
  userIdParam,
  usersQuery,
} from '../schemas/admin-users.schema.js';
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

/** 201 with a Location the client can GET; the base comes from where the router is mounted. */
export function createUserController(users: UserService): RequestHandler {
  return async (req, res) => {
    const created = await users.create(readValidated(res, createUserBody));
    res.status(201).location(`${req.baseUrl}/${created.userId}`).json(created);
  };
}

export function updateUserController(users: UserService): RequestHandler {
  return async (req, res) => {
    const { userId } = readValidated(res, userIdParam);
    res.json(await users.update(currentUser(req), userId, readValidated(res, patchUserBody)));
  };
}

export function deleteUserController(users: UserService): RequestHandler {
  return async (req, res) => {
    await users.delete(currentUser(req), readValidated(res, userIdParam).userId);
    res.status(204).end();
  };
}
