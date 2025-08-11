// src/users/users.controller.ts

import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Kita akan kosongkan isinya untuk sekarang.
  // Endpoint untuk user akan kita buat nanti sesuai kebutuhan.
}