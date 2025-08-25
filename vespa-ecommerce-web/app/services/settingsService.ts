import api from '@/lib/api';

/**
 * Mengambil persentase PPN dari API.
 * @returns {Promise<number>} Nilai persentase PPN.
 */
export const getVatPercentage = async (): Promise<number> => {
  try {
    const { data } = await api.get('/settings/ppn');
    return data.value; 
  } catch (error) {
    console.error('Gagal mengambil PPN, menggunakan nilai default (11%).', error);
    return 11;
  }
};