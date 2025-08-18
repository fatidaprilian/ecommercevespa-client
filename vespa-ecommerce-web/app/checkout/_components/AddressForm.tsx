// file: app/checkout/_components/AddressForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

import { calculateCost, ShippingRate } from '@/services/shippingService';
import { getAddresses, Address } from '@/services/addressService';
import { useCartStore } from '@/store/cart';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog'; // Cukup import Dialog
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NewAddressForm } from './NewAddressForm';

interface AddressFormProps {
  onShippingSelect: (option: ShippingRate | null) => void;
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
}

const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

export function AddressForm({ onShippingSelect, selectedAddress, setSelectedAddress }: AddressFormProps) {
    const queryClient = useQueryClient();
    const { cart, selectedItems } = useCartStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);

    const handleAddNew = () => {
        setAddressToEdit(null); // Pastikan null untuk mode "Tambah Baru"
        setIsModalOpen(true);
    };

    const handleEdit = (address: Address) => {
        setAddressToEdit(address); // Simpan alamat yang akan diedit
        setIsModalOpen(true);
    };

    const [shippingOptions, setShippingOptions] = useState<ShippingRate[]>([]);
    const [selectedShippingService, setSelectedShippingService] = useState<string | null>(null);
    const [isCalculatingCost, setIsCalculatingCost] = useState(false);

    const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
        queryKey: ['addresses'],
        queryFn: getAddresses,
        onSuccess: (data) => {
            if (!selectedAddress && Array.isArray(data) && data.length > 0) {
                const defaultAddress = data.find(addr => addr.isDefault) || data[0];
                setSelectedAddress(defaultAddress);
            }
        }
    });
    
    useEffect(() => {
        const fetchShippingCosts = async () => {
            if (!selectedAddress) return;

            setShippingOptions([]);
            setSelectedShippingService(null);
            onShippingSelect(null);

            const selectedCartItems = cart?.items?.filter(item => selectedItems.has(item.id)) || [];
            
            if (selectedCartItems.length > 0) {
                setIsCalculatingCost(true);
                const itemsPayload = selectedCartItems.map(item => ({
                    name: item.product.name.substring(0, 49),
                    value: item.product.priceInfo?.finalPrice || item.product.price,
                    quantity: item.quantity,
                    weight: item.product.weight || 1000
                }));

                try {
                    const rates = await calculateCost({
                        destination_area_id: selectedAddress.districtId,
                        destination_postal_code: selectedAddress.postalCode,
                        items: itemsPayload,
                    });
                    
                    if (rates.length > 0) setShippingOptions(rates);
                    else toast.error("Tidak ada opsi pengiriman untuk tujuan ini.");

                } catch (error) {
                    toast.error("Gagal menghitung ongkos kirim.");
                } finally {
                    setIsCalculatingCost(false);
                }
            }
        };

        fetchShippingCosts();
    }, [selectedAddress, cart, selectedItems, onShippingSelect]);
    
    const handleShippingSelect = (serviceIdentifier: string) => {
        setSelectedShippingService(serviceIdentifier);
        const selectedOption = shippingOptions.find(opt => `${opt.courier_name}-${opt.courier_service_name}` === serviceIdentifier);
        onShippingSelect(selectedOption || null);
    };

    const groupedShippingOptions = useMemo(() => {
        return shippingOptions.reduce((acc, option) => {
            const courier = option.courier_name.toUpperCase();
            if (!acc[courier]) acc[courier] = [];
            acc[courier].push(option);
            return acc;
        }, {} as Record<string, ShippingRate[]>);
    }, [shippingOptions]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Pilih Alamat Pengiriman</span>
                        <Button variant="outline" size="sm" onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Alamat</Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingAddresses ? <p>Memuat alamat...</p> : (
                        <RadioGroup onValueChange={(id) => setSelectedAddress(addresses?.find(a => a.id === id) || null)} value={selectedAddress?.id ?? ''}>
                            {addresses?.map(address => (
                                <div key={address.id} className="relative group">
                                    <Label htmlFor={address.id} className="flex items-center space-x-3 border p-4 rounded-md has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                                        <RadioGroupItem value={address.id} id={address.id} />
                                        <div>
                                            <p className="font-bold">{address.isDefault ? "Utama" : "Alamat"}</p>
                                            <p className="text-gray-600">{address.street}, {address.district}, {address.city}, {address.province}, {address.postalCode}</p>
                                        </div>
                                    </Label>
                                    <Button variant="outline" size="icon" className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(address)}><Edit className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                </CardContent>
            </Card>

            {selectedAddress && (
                <Card>
                  <CardHeader><CardTitle>Pilih Pengiriman</CardTitle></CardHeader>
                  <CardContent> 
                    {isCalculatingCost ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin h-4 w-4"/> Menghitung ongkos kirim...</div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {Object.entries(groupedShippingOptions).map(([courierName, services]) => (
                                <AccordionItem value={courierName} key={courierName}>
                                    <AccordionTrigger className="font-bold">{courierName}</AccordionTrigger>
                                    <AccordionContent>
                                        <RadioGroup onValueChange={handleShippingSelect} value={selectedShippingService || ''}>
                                            {services.map(option => {
                                                const id = `${option.courier_name}-${option.courier_service_name}`;
                                                return (
                                                  <Label key={id} htmlFor={id} className="flex items-center space-x-3 border p-3 rounded-md has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                                                      <RadioGroupItem value={id} id={id} />
                                                      <div className="font-normal w-full flex justify-between items-center">
                                                        <div>
                                                            <p className="font-semibold">{option.courier_service_name}</p>
                                                            <p className="text-sm text-gray-500">Estimasi: {option.estimation}</p>
                                                        </div>
                                                        <p className="font-semibold text-base">{formatPrice(option.price)}</p>
                                                      </div>
                                                  </Label>
                                                )
                                            })}
                                        </RadioGroup>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                  </CardContent>
                </Card>
            )}
            
            {/* ==================== PERBAIKAN #3: KIRIM DATA KE DIALOG ==================== */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <NewAddressForm 
                    initialData={addressToEdit} // Kirim data alamat yang akan diedit
                    onSuccess={(newAddress) => {
                        queryClient.invalidateQueries({ queryKey: ['addresses'] });
                        if (selectedAddress?.id === newAddress.id || !selectedAddress) {
                            setSelectedAddress(newAddress);
                        }
                        setIsModalOpen(false);
                    }} 
                    closeModal={() => setIsModalOpen(false)} 
                />
            </Dialog>
            {/* ========================================================================= */}
        </div>
    );
}