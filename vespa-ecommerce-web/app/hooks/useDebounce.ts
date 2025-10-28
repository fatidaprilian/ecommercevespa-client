// app/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout baru
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bersihkan timeout sebelumnya setiap kali value berubah
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Hanya re-run jika value atau delay berubah

  return debouncedValue;
}