// file: vespa-ecommerce-api/src/auth/interfaces/jwt.payload.ts

// Nama interface diubah untuk merefleksikan bahwa ini adalah payload
// pengguna yang sudah divalidasi dan dilampirkan ke request.
export interface UserPayload {
  id: string; 
  email: string;
  role: string;
}