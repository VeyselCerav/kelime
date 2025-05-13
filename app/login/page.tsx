'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş yapılırken bir hata oluştu');
      }

      router.push('/admin');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Giriş yapılırken bir hata oluştu');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="card bg-white border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all rounded-2xl">
          <div className="card-body p-8">
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
              Yönetici Girişi
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Kullanıcı Adı</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Şifre</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                  required
                />
              </div>

              {error && (
                <div className="alert bg-red-50 text-red-600 border-red-200 border-2 rounded-xl">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl w-full hover:shadow-lg transition-all"
              >
                Giriş Yap
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 