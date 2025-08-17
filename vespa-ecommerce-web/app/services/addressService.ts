// file: app/services/addressService.ts
import api from '@/lib/api';

// Tipe data ini harus cocok dengan model Prisma Anda
export interface Address {
  id: string;
  street: string;
  provinceId: string;
  province: string;
  cityId: string;
  city: string;
  districtId: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}

// Tipe data untuk payload saat membuat alamat baru
export interface CreateAddressData extends Omit<Address, 'id' | 'isDefault' | 'userId'> {
  isDefault?: boolean;
}

/**
 * Mengambil semua alamat yang tersimpan untuk pengguna yang sedang login.
 */
export const getAddresses = async (): Promise<Address[]> => {
  const { data } = await api.get('/addresses');
  return data;
};

/**
 * Menyimpan alamat baru untuk pengguna yang sedang login.
 */
export const createAddress = async (addressData: CreateAddressData): Promise<Address> => {
  const { data } = await api.post('/addresses', addressData);
  return data;
};

/**
 * Memperbarui alamat yang sudah ada.
 */
export const updateAddress = async ({ id, addressData }: { id: string, addressData: Partial<CreateAddressData> }): Promise<Address> => {
    const { data } = await api.patch(`/addresses/${id}`, addressData);
    return data;
}

/**
 * Menghapus alamat.
 */
export const deleteAddress = async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`);
}