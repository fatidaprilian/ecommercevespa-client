// file: app/services/shippingService.ts

import api from '@/lib/api';

// Definisikan tipe data yang lebih ketat, hanya yang dibutuhkan form
export interface AreaData {
  id: string;
  label: string;
  postalCode: string;
}

export interface ShippingRate {
  courier_name: string;
  courier_service_name: string;
  price: number;
  estimation: string;
}

export const searchAreas = async (query: string): Promise<AreaData[]> => {
    if (query.length < 3) return [];
    const { data } = await api.get('/shipping/areas', { params: { q: query } });
    
    if (!Array.isArray(data)) {
        return [];
    }
    
    const uniqueAreas = new Map<string, AreaData>();

    data.forEach((area: any) => {
        const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
        
        if (area.id && !uniqueAreas.has(label)) {
            let postalCode = String(area.postal_code || '');
            
            if (!/^\d{5}$/.test(postalCode)) {
                const match = area.name?.match(/\b\d{5}\b/);
                if (match) {
                  postalCode = match[0];
                }
            }

            if (/^\d{5}$/.test(postalCode)) {
                uniqueAreas.set(label, {
                    id: area.id,
                    label: label,
                    postalCode: postalCode
                });
            }
        }
    });

    return Array.from(uniqueAreas.values());
};

export const calculateCost = async (payload: {
  destination_area_id: string;
  destination_postal_code: string;
  items: { name: string, value: number, quantity: number, weight: number }[]
}): Promise<ShippingRate[]> => {
  const { data } = await api.post('/shipping/cost', payload); 
  return data.map((rate: any) => ({
      courier_name: rate.company,
      courier_service_name: rate.type,
      price: rate.price,
      // 👇 **PERBAIKAN UTAMA DI SINI** 👇
      // Ganti 'estimation_in_day' menjadi 'duration' agar sesuai dengan respons API Biteship
      estimation: rate.duration || 'N/A'
      // 👆 **END OF CHANGES** 👆
  }));
};