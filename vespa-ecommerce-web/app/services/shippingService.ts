// file: app/services/shippingService.ts

import api from '@/lib/api';

// Tipe data yang dibutuhkan untuk form alamat
export interface AreaData {
  id: string;
  label: string;
  postalCode: string;
}

// Tipe data untuk hasil kalkulasi ongkos kirim
export interface ShippingRate {
  courier_name: string;
  courier_service_name: string;
  price: number;
  estimation: string;
}

// Tipe data untuk hasil tracking, sesuai respons Biteship
export interface TrackingHistory {
  note: string;
  updated_at: string;
  status: string;
}

export interface TrackingDetails {
  success: boolean;
  waybill_id: string;
  courier: {
    company: string;
    driver_name?: string;
    driver_phone?: string;
  };
  origin: {
    contact_name: string;
    address: string;
  };
  destination: {
    contact_name: string;
    address: string;
  };
  history: TrackingHistory[];
  status: string;
}

/**
 * Mencari data area/kecamatan dari Biteship.
 */
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

/**
 * Menghitung estimasi ongkos kirim dari Biteship.
 */
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
      estimation: rate.duration || 'N/A'
  }));
};


/**
 * Mengambil detail pelacakan pengiriman dari API backend kita.
 * @param waybillId - Nomor resi (AWB).
 * @param courierCode - Kode kurir.
 */
export const getTrackingDetails = async (waybillId: string, courierCode: string): Promise<TrackingDetails> => {
  if (!waybillId || !courierCode) {
    throw new Error('Nomor resi dan kode kurir dibutuhkan.');
  }
  const { data } = await api.get(`/shipping/track/${waybillId}/${courierCode}`);
  return data;
};