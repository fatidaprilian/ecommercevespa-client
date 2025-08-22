// file: pages/services/shippingService.ts

import api from '@/lib/api';

export interface LocationData {
  id: string;
  name: string;
  label: string;
  postalCode: string;
}

export const searchAreas = async (query: string): Promise<LocationData[]> => {
    if (query.length < 3) return [];
    const { data } = await api.get('/shipping/areas', { params: { q: query } });
    
    if (!Array.isArray(data)) {
        return [];
    }
    
    // 👇 **START OF CHANGES** 👇
    const uniqueAreas = new Map<string, LocationData>();

    data.forEach((area: any) => {
        // Buat label yang konsisten untuk dijadikan kunci pengecekan duplikat
        const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
        
        // Hanya tambahkan ke map jika label tersebut belum ada
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
    // 👆 **END OF CHANGES** 👆
};