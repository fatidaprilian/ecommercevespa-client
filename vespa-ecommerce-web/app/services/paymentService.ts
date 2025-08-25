
import api from '@/lib/api';

export interface ManualPaymentMethod {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  logoUrl?: string;
  isActive: boolean;
}


export const getActivePaymentMethods = async (): Promise<ManualPaymentMethod[]> => {
  const { data } = await api.get('/payment-methods'); 
};