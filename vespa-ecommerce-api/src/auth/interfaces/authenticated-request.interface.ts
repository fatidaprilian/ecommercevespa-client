// src/auth/interfaces/authenticated-request.interface.ts

import { Request } from 'express';
import { UserPayload } from './jwt.payload';

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}