// services/settingsService.ts
import api from '@/lib/api';

/**
 * Mengambil persentase PPN dari API.
 * @returns {Promise<number>} Nilai persentase PPN.
 */
export const getVatPercentage = async (): Promise<number> => {
  try {
    // Memanggil endpoint GET /settings/ppn yang sudah kita buat
    const { data } = await api.get('/settings/ppn');
    return data.value; // API mengembalikan { key: 'PPN', value: 11 }
  } catch (error) {
    console.error('Gagal mengambil PPN, menggunakan nilai default (11%).', error);
    // Jika API gagal, kembalikan nilai default agar perhitungan tidak kacau
    return 11;
  }
};