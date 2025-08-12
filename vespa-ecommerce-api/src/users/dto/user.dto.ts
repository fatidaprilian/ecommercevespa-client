// src/users/dto/user.dto.ts
import { UserRole } from '@prisma/client';

export class UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}