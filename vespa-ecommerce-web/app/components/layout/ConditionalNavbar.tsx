'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const hiddenPaths = ['/checkout', '/login', '/register',];
  const isOrderDetailPage = pathname.startsWith('/orders/') && pathname.length > '/orders/'.length;

  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  if (isOrderDetailPage) {
    return null;
  }

  return <Navbar />;
}