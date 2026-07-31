import RegisterForm from '@/app/components/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface px-container-margin py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold italic tracking-tight text-primary">
            YDS Monster
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Yeni hesap oluştur
          </p>
        </div>

        <div className="paper-texture soft-shadow rounded-card border border-outline-variant/40 p-6 sm:p-8">
          <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">
            Kayıt Ol
          </h1>
          <RegisterForm />
        </div>

        <Link
          href="/login"
          className="mt-6 text-center text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          ← Giriş sayfasına dön
        </Link>
      </div>
    </div>
  );
}
