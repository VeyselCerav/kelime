import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace('/login');
    }
  }, [session, status]);

  if (status === "loading") {
    return <div>Yükleniyor...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Yönetici Paneli</h1>
      <p>Hoş geldiniz, {session?.user?.username}</p>
    </div>
  );
} 