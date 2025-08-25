'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

export const AccurateIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/accurate/status');
        setIsConnected(response.data.isConnected);
      } catch (error) {
        console.error('Error fetching Accurate status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const handleConnectClick = async () => {
    try {
      const response = await api.get('/accurate/authorize-url');
      const { url } = response.data;

      window.location.href = url;
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
      alert('Gagal memulai koneksi. Cek konsol untuk detail.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrasi Accurate ERP</CardTitle>
        <CardDescription>
          Hubungkan toko Anda dengan Accurate untuk sinkronisasi data secara otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Memeriksa status koneksi...</p>
        ) : isConnected ? (
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-semibold">✅ Terhubung</span>
            <Button variant="outline" disabled>
              Sudah Terhubung
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnectClick}>
            Hubungkan ke Accurate
          </Button>
        )}
      </CardContent>
    </Card>
  );
};