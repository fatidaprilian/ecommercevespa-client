// src/auth/guards/admin-local-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// Gunakan nama strategy yang sama ('admin-local')
export class AdminLocalAuthGuard extends AuthGuard('admin-local') {}