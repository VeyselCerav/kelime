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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setIsDropdownOpen(false);
    
    if (pathname === '/flashcards') {
      router.push(`/flashcards?week=${week}`);
    }
  };

  const menuItems = [
    { href: '/flashcards', label: 'Kelime Kartları' },
    { href: '/quiz', label: 'Test' },
    { href: '/practice', label: 'Tekrar Et' },
    ...(session ? [
      { href: '/unlearned-words', label: 'Ezberleyemediklerim' },
      { href: '/profile', label: 'Profil' }
    ] : [])
  ];

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

            {/* Desktop Menu */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            {/* Hafta Seçimi Dropdown - Desktop */}
            {(pathname === '/flashcards' || pathname === '/practice' || pathname === '/quiz') && (
              <div className="relative hidden md:block">
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

            {/* Oturum Durumu - Desktop */}
            <div className="hidden md:flex md:items-center md:ml-4">
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

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Menüyü aç</span>
                {!isMobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="pt-2 pb-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive(item.href)
                  ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Hafta Seçimi - Mobile */}
        {(pathname === '/flashcards' || pathname === '/practice' || pathname === '/quiz') && (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4">
              <div className="text-base font-medium text-gray-800">Hafta Seçimi</div>
              <div className="mt-2 space-y-1">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <button
                    key={week}
                    onClick={() => {
                      handleWeekChange(week);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-base ${
                      selectedWeek === week
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    Hafta {week}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Oturum Durumu - Mobile */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="px-4">
            {session ? (
              <Link
                href="/api/auth/signout"
                className="block text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 px-4 py-2 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Çıkış Yap
              </Link>
            ) : (
              <Link
                href="/login"
                className="block text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 px-4 py-2 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 