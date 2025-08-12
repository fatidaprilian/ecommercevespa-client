'use client';

import { useState, useEffect } from 'react';

// This component ensures its children are only rendered on the client side.
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // If the component has not mounted yet, don't render anything.
  if (!hasMounted) {
    return null;
  }

  // Once mounted, render the children.
  return <>{children}</>;
}