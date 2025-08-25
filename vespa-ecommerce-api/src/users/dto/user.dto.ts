import { Role } from '@prisma/client';

export class UserDto {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}