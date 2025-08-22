import { Role } from '@prisma/client'; // <-- Ganti UserRole menjadi Role

export class UserDto {
  id: string;
  email: string;
  name?: string;
  role: Role; // <-- Ganti UserRole menjadi Role
  createdAt: Date;
  updatedAt: Date;
}