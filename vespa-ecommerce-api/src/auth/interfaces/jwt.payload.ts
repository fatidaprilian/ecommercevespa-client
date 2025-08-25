// file: vespa-ecommerce-api/src/auth/interfaces/jwt.payload.ts

export interface UserPayload {
  id: string; 
  email: string;
  role: string;
  name: string;
}