import api from '@/lib/api';

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  type: 'HERO' | 'MIDDLE';
  isActive: boolean;
}

// Tipe data ini digunakan saat membuat atau memperbarui banner.
// Omit<Banner, 'id'> berarti "ambil semua properti dari Banner kecuali id".
export type BannerData = Omit<Banner, 'id'>;

/**
 * Mengambil semua banner dari backend.
 * Digunakan untuk menampilkan daftar banner di halaman utama pengaturan.
 */
export const getBanners = async (): Promise<Banner[]> => {
  const { data } = await api.get('/homepage-banners');
  return data;
};

/**
 * Mengambil satu banner berdasarkan ID-nya.
 * Digunakan di halaman edit banner.
 * @param id - ID dari banner yang ingin diambil.
 */
export const getBannerById = async (id: string): Promise<Banner> => {
  const { data } = await api.get(`/homepage-banners/${id}`);
  return data;
};

/**
 * Membuat banner baru.
 * @param bannerData - Data untuk banner baru yang akan dibuat.
 */
export const createBanner = async (bannerData: BannerData): Promise<Banner> => {
  const { data } = await api.post('/homepage-banners', bannerData);
  return data;
};

/**
 * Memperbarui banner yang sudah ada.
 * @param id - ID dari banner yang akan diperbarui.
 * @param bannerData - Data baru untuk banner.
 */
export const updateBanner = async (id: string, bannerData: Partial<BannerData>): Promise<Banner> => {
  const { data } = await api.patch(`/homepage-banners/${id}`, bannerData);
  return data;
};

/**
 * Menghapus banner berdasarkan ID-nya.
 * @param id - ID dari banner yang akan dihapus.
 */
export const deleteBanner = async (id: string): Promise<void> => {
  await api.delete(`/homepage-banners/${id}`);
};