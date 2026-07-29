import api from '@/lib/api';

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

export const searchAreas = async (query: string): Promise<AreaData[]> => {
    if (query.length < 3) return [];
    const { data } = await api.get('/shipping/areas', { params: { q: query } });
    
    if (!Array.isArray(data)) {
        return [];
    }
    
    const uniqueAreas = new Map<string, AreaData>();

    interface RawArea {
        id?: string;
        name?: string;
        administrative_division_level_1_name?: string;
        administrative_division_level_2_name?: string;
        administrative_division_level_3_name?: string;
        postal_code?: string;
    }

    data.forEach((area: unknown) => {
        const rawArea = area as RawArea;
        const label = `${rawArea.administrative_division_level_3_name}, ${rawArea.administrative_division_level_2_name}, ${rawArea.administrative_division_level_1_name}`;
        
        if (rawArea.id && !uniqueAreas.has(label)) {
            let postalCode = String(rawArea.postal_code || '');
            
            if (!/^\d{5}$/.test(postalCode)) {
                const match = rawArea.name?.match(/\b\d{5}\b/);
                if (match) {
                  postalCode = match[0];
                }
            }

            if (/^\d{5}$/.test(postalCode)) {
                uniqueAreas.set(label, {
                    id: rawArea.id,
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
  interface RawRate {
      company: string;
      type: string;
      price: number;
      duration?: string;
  }
  return data.map((rate: unknown) => {
      const rawRate = rate as RawRate;
      return {
          courier_name: rawRate.company,
          courier_service_name: rawRate.type,
          price: rawRate.price,
          estimation: rawRate.duration || 'N/A'
      };
  });
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