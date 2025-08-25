import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { User, Role } from '@/services/userService';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const { data: userProfile } = await api.get<User>('/users/profile');

        if (userProfile && userProfile.role === Role.ADMIN) {
          setIsAuthorized(true);
        } else {
          throw new Error('Access Denied');
        }
      } catch (error) {
        router.replace('/auth/login');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdmin();
  }, [router]); 

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return null;
}