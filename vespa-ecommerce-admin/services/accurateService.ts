import api from '@/lib/api';

export interface AccurateBankAccount {
  id: number;
  no: string; 
  name: string;
  accountType: string;
}

export const getAccurateBankAccounts = async (): Promise<AccurateBankAccount[]> => {
  const { data } = await api.get('/accurate/bank-accounts');
  return data;
};