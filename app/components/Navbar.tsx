'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWeek } from '../context/WeekContext';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { selectedWeek, setSelectedWeek, totalWeeks } = useWeek();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setIsDropdownOpen(false);
    
    // URL'yi güncelle
    if (pathname === '/flashcards') {
      router.push(`/flashcards?week=${week}`);
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary">
                Haftalık Kelime
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/flashcards"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/flashcards')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Kelime Kartları
              </Link>
              <Link
                href="/quiz"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/quiz')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Test
              </Link>
              <Link
                href="/practice"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/practice')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Tekrar Et
              </Link>
              {session && (
                <>
                  <Link
                    href="/unlearned-words"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/unlearned-words')
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Ezberleyemediklerim
                  </Link>
                  <Link
                    href="/profile"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/profile')
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Profil
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Hafta Seçimi Dropdown */}
            {(pathname === '/flashcards' || pathname === '/practice' || pathname === '/quiz') && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center px-4 py-2 border border-primary/20 text-sm font-medium rounded-md text-primary bg-white hover:bg-primary/5 focus:outline-none"
                >
                  Hafta {selectedWeek}
                  <svg
                    className={`ml-2 h-5 w-5 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1 max-h-60 overflow-auto" role="menu">
                      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                        <button
                          key={week}
                          onClick={() => handleWeekChange(week)}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedWeek === week
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          Hafta {week}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Oturum Durumu */}
            <div className="flex items-center">
              {session ? (
                <Link
                  href="/api/auth/signout"
                  className="inline-flex items-center px-4 py-2 border border-primary/20 text-sm font-medium rounded-md text-primary bg-white hover:bg-primary/5"
                >
                  Çıkış Yap
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-primary/20 text-sm font-medium rounded-md text-primary bg-white hover:bg-primary/5"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 