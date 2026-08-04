// pages/settings/banners/form.tsx

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Info, Loader2, Save, UploadCloud, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { createBanner, updateBanner, getBanners, Banner, BannerData } from '@/services/bannerService';
import { getBrands } from '@/services/brandService';
import { uploadImage } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const BANNER_TYPE_CONFIG: Record<string, { label: string; maxQuota: number; sizeHint: string }> = {
  HERO: { label: 'Hero Carousel', maxQuota: 5, sizeHint: '2412 × 804 px (rasio 3:1)' },
  TOP_LEFT: { label: '2 Banner Atas (Kiri)', maxQuota: 1, sizeHint: '1000 × 750 px (rasio 4:3)' },
  TOP_RIGHT: { label: '2 Banner Atas (Kanan)', maxQuota: 1, sizeHint: '1000 × 750 px (rasio 4:3)' },
  MIDDLE: { label: 'Banner Tengah', maxQuota: 1, sizeHint: '1800 × 600 px (rasio 3:1)' },
  BOTTOM: { label: 'Banner About Us (Bawah)', maxQuota: 1, sizeHint: '1200 × 800 px (rasio 3:2)' },
};

// Types that support text overlay & button customization
const OVERLAY_TYPES = ['TOP_LEFT', 'TOP_RIGHT'];
// Types that support color customization (text + button)
const COLOR_TYPES = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM'];

const bannerSchema = z.object({
  title: z.string().max(40, 'Maks. 40 karakter').nullable().transform(e => e === "" ? null : e),
  subtitle: z.string().max(80, 'Maks. 80 karakter').nullable().transform(e => e === "" ? null : e),
  imageUrl: z.string().url('URL Gambar tidak valid.').min(1, 'Gambar wajib di-upload.'),
  linkUrl: z.string().nullable().transform(e => e === "" ? null : e),
  type: z.enum(['HERO', 'MIDDLE', 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM']),
  isActive: z.boolean(),
  brandId: z.string().nullable().transform(e => e === "" ? null : e),
  buttonText: z.string().max(20, 'Maks. 20 karakter').nullable().transform(e => e === "" ? null : e),
  textColor: z.string().nullable().transform(e => e === "" ? null : e),
  buttonColor: z.string().nullable().transform(e => e === "" ? null : e),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerFormProps {
  initialData?: Banner;
}

export function BannerForm({ initialData }: BannerFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);

  // Fetch existing banners for quota check
  const { data: allBanners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: getBanners,
  });

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: initialData?.title || '',
      subtitle: initialData?.subtitle || '',
      imageUrl: initialData?.imageUrl || '',
      linkUrl: initialData?.linkUrl || '',
      type: initialData?.type || 'HERO',
      isActive: initialData?.isActive ?? true,
      brandId: initialData?.brandId || '',
      buttonText: initialData?.buttonText || '',
      textColor: initialData?.textColor || '#FFFFFF',
      buttonColor: initialData?.buttonColor || '#000000',
    },
  });

  const watchedType = form.watch('type');
  const showOverlayFields = OVERLAY_TYPES.includes(watchedType);
  const showColorFields = COLOR_TYPES.includes(watchedType);

  // Quota counts per type (exclude current banner if editing)
  const getQuotaCount = (type: string) => {
    return allBanners.filter(
      (b) => b.type === type && b.isActive && b.id !== initialData?.id
    ).length;
  };

  const { data: brandsResponse } = useQuery({
    queryKey: ['brands', { page: 1, search: brandSearch }],
    queryFn: () => getBrands({ page: 1, search: brandSearch }),
    enabled: watchedType === 'MIDDLE',
  });
  const brands = brandsResponse?.data ?? [];

  const selectedBrandName = (() => {
    const currentBrandId = form.watch('brandId');
    if (!currentBrandId) return null;
    const found = brands.find(b => b.id === currentBrandId);
    if (found) return found.name;
    if (initialData?.brand?.id === currentBrandId) return initialData.brand.name;
    return null;
  })();

  const mutation = useMutation({
    mutationFn: (data: BannerData) => 
      initialData ? updateBanner(initialData.id, data) : createBanner(data),
    onSuccess: () => {
      toast.success(`Banner berhasil ${initialData ? 'diperbarui' : 'dibuat'}!`);
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      router.push('/settings/banners');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const toastId = toast.loading('Mengunggah gambar...');
    try {
      const response = await uploadImage(file);
      form.setValue('imageUrl', response.url, { shouldValidate: true });
      toast.success('Gambar berhasil diunggah!', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengunggah.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const imageUrlValue = form.watch('imageUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => { mutation.mutate(d as BannerData); })}>
        <Card>
          <CardHeader>
            <CardTitle>{initialData ? 'Edit Banner' : 'Tambah Banner Baru'}</CardTitle>
            <CardDescription>Isi detail banner di bawah ini, lalu klik simpan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Tipe Banner with quota */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Banner</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== 'MIDDLE') {
                      form.setValue('brandId', null);
                    }
                    // Reset overlay fields when switching away
                    if (!OVERLAY_TYPES.includes(value)) {
                      form.setValue('buttonText', null);
                    }
                    if (!COLOR_TYPES.includes(value)) {
                      form.setValue('textColor', '#FFFFFF');
                      form.setValue('buttonColor', '#000000');
                    }
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(BANNER_TYPE_CONFIG).map(([type, config]) => {
                        const count = getQuotaCount(type);
                        const isFull = count >= config.maxQuota;
                        const isCurrentType = initialData?.type === type;
                        return (
                          <SelectItem
                            key={type}
                            value={type}
                            disabled={isFull && !isCurrentType}
                          >
                            {config.label} ({count}/{config.maxQuota}{isFull && !isCurrentType ? ' - Penuh' : ''})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {BANNER_TYPE_CONFIG[watchedType] && (
                    <FormDescription className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Ukuran rekomendasi: {BANNER_TYPE_CONFIG[watchedType].sizeHint}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title - only for overlay types */}
            {showOverlayFields && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Overlay</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Promo Akhir Tahun" maxLength={40} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Maks. 40 karakter. Kosongkan jika tidak ingin tampilkan teks overlay.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Subtitle - only for overlay types */}
            {showOverlayFields && (
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-judul (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Diskon hingga 50%" maxLength={80} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Maks. 80 karakter.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Button Text - only for overlay types */}
            {showOverlayFields && (
              <FormField
                control={form.control}
                name="buttonText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teks Tombol (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Lihat Semua" maxLength={20} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Maks. 20 karakter. Kosongkan jika tidak ingin tampilkan tombol.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Text Color - for overlay and bottom types */}
            {showColorFields && (
              <FormField
                control={form.control}
                name="textColor"
                render={({ field }) => {
                  const isTransparent = field.value === 'transparent';
                  return (
                    <FormItem>
                      <FormLabel>Warna Teks</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="color"
                            value={isTransparent ? '#FFFFFF' : (field.value || '#FFFFFF')}
                            onChange={(e) => { field.onChange(e.target.value); }}
                            disabled={isTransparent}
                            className="w-10 h-10 rounded border cursor-pointer disabled:opacity-50"
                          />
                        </FormControl>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isTransparent}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? 'transparent' : '#FFFFFF');
                            }}
                          />
                          <span className="text-sm text-muted-foreground">Transparan</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{field.value || '#FFFFFF'}</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Button Color - for overlay and bottom types */}
            {showColorFields && (
              <FormField
                control={form.control}
                name="buttonColor"
                render={({ field }) => {
                  const isTransparent = field.value === 'transparent';
                  return (
                    <FormItem>
                      <FormLabel>Warna Tombol</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="color"
                            value={isTransparent ? '#000000' : (field.value || '#000000')}
                            onChange={(e) => { field.onChange(e.target.value); }}
                            disabled={isTransparent}
                            className="w-10 h-10 rounded border cursor-pointer disabled:opacity-50"
                          />
                        </FormControl>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isTransparent}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? 'transparent' : '#000000');
                            }}
                          />
                          <span className="text-sm text-muted-foreground">Transparan</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{field.value || '#000000'}</span>
                      </div>
                      <FormDescription>
                        {isTransparent ? 'Tombol akan tampil tanpa background (hanya border + teks).' : ''}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Link URL - for all except BOTTOM */}
            {watchedType !== 'BOTTOM' && (
              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Link (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="/products/id-produk" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Bisa diisi path relatif (misal: /products/123) atau URL lengkap.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Brand selector - only for MIDDLE */}
            {watchedType === 'MIDDLE' && (
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Merk Terkait (Opsional)</FormLabel>
                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={brandOpen}
                            className={cn(
                              "w-full max-w-sm justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedBrandName ?? "Pilih merk..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full max-w-sm p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Cari merk..."
                            value={brandSearch}
                            onValueChange={setBrandSearch}
                          />
                          <CommandList>
                            <CommandEmpty>Merk tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {brands.map((brand) => (
                                <CommandItem
                                  key={brand.id}
                                  value={brand.id}
                                  onSelect={() => {
                                    form.setValue('brandId', brand.id === field.value ? null : brand.id);
                                    setBrandOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === brand.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {brand.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Jika dipilih, produk dari merk ini akan ditampilkan di bawah banner di homepage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Image Upload */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Gambar</FormLabel>
                  <FormControl>
                    {imageUrlValue ? (
                      <div className="relative w-full max-w-sm aspect-video group">
                        <img src={imageUrlValue} alt="Preview" className="w-full h-full object-cover rounded-md border" />
                        <Button
                          type="button" size="icon" variant="destructive"
                          onClick={() => { form.setValue('imageUrl', ''); }}
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Klik untuk mengunggah</span>
                        <Input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
                      </label>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 max-w-sm">
                  <FormLabel>Aktifkan Banner</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { router.back(); }}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending || isUploading}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Simpan Banner
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}