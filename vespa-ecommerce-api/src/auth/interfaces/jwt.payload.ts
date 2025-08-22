// file: vespa-ecommerce-api/src/auth/interfaces/jwt.payload.ts

// Interface ini mendefinisikan struktur objek 'user'
// yang akan tersedia di 'req.user' setelah login.
export interface UserPayload {
  id: string; 
  email: string;
  role: string;
  name: string;
}