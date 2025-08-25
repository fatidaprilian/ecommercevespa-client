import api from '@/lib/api';

export interface Address {
  id: string;
  street: string;
  phone: string;
  provinceId: string;
  province: string;
  cityId: string;
  city: string;
  districtId: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CreateAddressData extends Omit<Address, 'id' | 'isDefault' | 'userId'> {
  isDefault?: boolean;
}

export const getAddresses = async (): Promise<Address[]> => {
  const { data } = await api.get('/addresses');
  return data;
};

export const createAddress = async (addressData: CreateAddressData): Promise<Address> => {
  const { data } = await api.post('/addresses', addressData);
  return data;
};

export const updateAddress = async ({ id, addressData }: { id: string, addressData: Partial<CreateAddressData> }): Promise<Address> => {
    const { data } = await api.patch(`/addresses/${id}`, addressData);
    return data;
}

export const deleteAddress = async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`);
}