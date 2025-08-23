// file: pages/services/shippingService.ts (Revisi Lengkap)

import api from '@/lib/api';

export interface LocationData {
  id: string;
  name: string;
  label: string;
  postalCode: string;
}

// [BARU] Tipe data untuk hasil tracking, sesuai respons Biteship
export interface TrackingHistory {
  note: string;
  updated_at: string;
  // Tambahkan eventDate untuk konsistensi dengan frontend utama
  eventDate: string; 
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

export const searchAreas = async (query: string): Promise<LocationData[]> => {
    if (query.length < 3) return [];
    const { data } = await api.get('/shipping/areas', { params: { q: query } });
    
    if (!Array.isArray(data)) {
        return [];
    }
    
    const uniqueAreas = new Map<string, LocationData>();

    data.forEach((area: any) => {
        const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
        
        if (area.id && !uniqueAreas.has(label)) {
            let postalCode = area.postal_code || '';
            
            if (!postalCode) {
                const match = area.name?.match(/\b\d{5}\b/);
                if (match) {
                  postalCode = match[0];
                }
            }

            uniqueAreas.set(label, {
                id: area.id,
                name: area.administrative_division_level_3_name,
                label: label,
                postalCode: postalCode
            });
        }
    });

    return Array.from(uniqueAreas.values());
};

// [BARU] Fungsi untuk mengambil detail pelacakan pengiriman
export const getTrackingDetails = async (waybillId: string, courierCode: string): Promise<TrackingDetails> => {
  if (!waybillId || !courierCode) {
    throw new Error('Nomor resi dan kode kurir dibutuhkan.');
  }
  // Endpoint ini memanggil backend API Anda, yang kemudian akan memanggil Biteship
  const { data } = await api.get(`/shipping/track/${waybillId}/${courierCode}`);
  return data;
};