// file: vespa-ecommerce-api/src/auth/interfaces/jwt.payload.ts

export interface JwtPayload {
  // --- PERUBAHAN DI SINI ---
  // Kita ganti 'sub' menjadi 'id' agar sesuai dengan objek
  // yang dikembalikan oleh JwtStrategy
  id: string; 
  email: string;
  role: string;
}