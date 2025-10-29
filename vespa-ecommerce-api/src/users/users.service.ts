// file: src/users/users.service.ts

import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common'; // Pastikan ForbiddenException diimpor
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client'; // Import User type
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mengambil semua pengguna AKTIF (untuk admin panel).
   * Password tidak akan ikut dikembalikan.
   */
  async findAll() {
    return this.prisma.user.findMany({
      where: {
        isActive: true, // Hanya ambil user yang aktif
      },
      select: { // Hanya pilih field yang aman dan relevan
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accurateCustomerNo: true,
        isActive: true, // Sertakan isActive
      },
      orderBy: {
        createdAt: 'desc', // Urutkan berdasarkan tanggal dibuat
      },
    });
  }

  // --- Metode Baru untuk Mengambil User Non-Aktif ---
  /**
   * Mengambil semua pengguna NON-AKTIF (untuk admin panel).
   */
  async findAllInactive() {
      return this.prisma.user.findMany({
          where: {
              isActive: false, // Hanya ambil user yang TIDAK aktif
          },
          select: { // Pilih field yang sama seperti findAll
              id: true, email: true, name: true, role: true, createdAt: true, accurateCustomerNo: true, isActive: true,
          },
          orderBy: {
              updatedAt: 'desc', // Urutkan berdasarkan kapan terakhir diubah (dinonaktifkan)
          },
      });
  }
  // --- Akhir Metode Baru ---

  /**
   * Memperbarui data pengguna secara komprehensif dari admin panel.
   * (Logika asli dipertahankan)
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id); // Memastikan user ada (mencari aktif/non-aktif)

    // Logika asli untuk update data
    let dataToUpdate: any = {
      ...updateUserDto,
      // Pastikan string kosong disimpan sebagai null
      accurateCustomerNo: updateUserDto.accurateCustomerNo === '' ? null : updateUserDto.accurateCustomerNo,
    };

    // Opsional: uncomment jika isActive tidak boleh diubah di sini
    // delete dataToUpdate.isActive;

    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
       select: { // Mengembalikan data yang diperbarui
        id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true, accurateCustomerNo: true, isActive: true,
      },
    });
  }

  /**
   * Mengubah role seorang pengguna.
   * (Logika asli dipertahankan)
   */
  async updateRole(userId: string, newRole: Role) {
    await this.findById(userId); // Memastikan user ada (mencari aktif/non-aktif)
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole }, // Update role
      select: { id: true, email: true, name: true, role: true, createdAt: true, isActive: true }, // Menambahkan isActive di select
    });
  }

  /**
   * Menonaktifkan seorang pengguna (soft delete).
   * (Logika diubah dari delete menjadi update isActive)
   */
  async remove(userId: string): Promise<Pick<User, 'id' | 'isActive'>> { // Tipe return disesuaikan
    const user = await this.prisma.user.findUnique({ // Cari user berdasarkan ID
      where: { id: userId },
    });

    if (!user) { // Handle jika user tidak ditemukan
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan.`);
    }

    if (!user.isActive) { // Handle jika user sudah tidak aktif
      throw new ConflictException(`User dengan ID ${userId} sudah tidak aktif.`);
    }

    // Lakukan update untuk menonaktifkan
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false }, // Set isActive menjadi false
      select: { id: true, isActive: true } // Kembalikan ID dan status baru
    });
    return updatedUser;
  }

  /**
   * Membuat pengguna baru.
   * (Logika asli dipertahankan, dengan tambahan cek isActive pada existingUser)
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, name, role } = createUserDto; // Ambil data dari DTO

    const existingUser = await this.prisma.user.findUnique({ // Mencari berdasarkan email (bisa aktif/tidak)
      where: { email },
    });

    if (existingUser) { // Handle jika email sudah ada
        if (!existingUser.isActive) {
            // Error jika akun tidak aktif
            throw new ConflictException('Email ini sudah terdaftar tetapi akun tidak aktif.');
        } else {
             // Error jika akun aktif
             throw new ConflictException('User dengan email ini sudah terdaftar');
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    // isActive otomatis true karena default di schema
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, role }, // Buat user baru
    });

    const { password: _, ...result } = user; // Hapus password dari hasil
    return result;
  }

  /**
   * Mencari pengguna berdasarkan email (hanya yang aktif).
   * (Logika asli dipertahankan dengan filter isActive)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email,
        isActive: true, // Hanya cari user aktif
       },
    });
  }

  /**
   * Mencari pengguna berdasarkan ID (termasuk yang tidak aktif).
   * (Logika asli dipertahankan)
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } }); // Cari semua by ID

    if (!user) { // Handle jika tidak ditemukan
        throw new NotFoundException(`User dengan ID ${id} tidak ditemukan.`);
    }
    // Kembalikan semua data kecuali password
    const { password, ...result } = user;
    return result; // result sudah termasuk isActive
  }

  /**
   * Memperbarui profil (nama) pengguna.
   * (Logika asli dipertahankan dengan tambahan cek isActive)
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
     const user = await this.findById(userId); // Cari user (bisa aktif/tidak)
     if (!user.isActive) { // Periksa statusnya
        throw new ForbiddenException('Akun Anda tidak aktif.'); // Error jika tidak aktif
     }

    return this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name }, // Update nama
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true, isActive: true }, // Menambahkan isActive di select
    });
  }

  /**
   * Mengubah status aktif/nonaktif pengguna.
   */
  async toggleIsActive(userId: string): Promise<Partial<User>> { // Ubah tipe return menjadi Partial<User>
      const user = await this.findById(userId); // findById sudah menangani NotFound
      const newStatus = !user.isActive; // Tentukan status baru

      // Update dan kembalikan data user yang relevan
      const updatedUser = await this.prisma.user.update({ // Assign hasil ke variabel
          where: { id: userId },
          data: { isActive: newStatus }, // Update status isActive
          select: { // Pilih field yang aman untuk dikembalikan
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            accurateCustomerNo: true,
            isActive: true, // Kembalikan status isActive yang baru
            emailVerified: true,
            // JANGAN sertakan password, token, dll.
          }
      });
      // Kembalikan variabel hasil update
      return updatedUser;
  }

} // End of UsersService class