import type { RequestHandler } from 'express';
import { toUserView } from '../domain/user.js';
import { currentUser } from '../middleware/authenticate.js';

/** GET /me: the signed-in user, already re-read from storage by authenticate. */
export const meController: RequestHandler = (req, res) => {
  res.json(toUserView(currentUser(req)));
};
