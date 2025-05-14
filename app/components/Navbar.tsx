'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeek } from '../context/WeekContext';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { selectedWeek, setSelectedWeek, totalWeeks } = useWeek();

  const isActive = (path: string) => pathname === path;

  // Menüyü kapat (geçiş animasyonlu)
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b-2 border-primary/10 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent transition-all">
              KelimeÖğren
            </span>
          </Link>

          {/* Masaüstü Menü */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Anasayfa
            </Link>
            <Link
              href="/flashcards"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/flashcards') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Kelime Kartları
            </Link>
            <Link
              href="/quiz"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/quiz') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Test
            </Link>
            <Link
              href="/practice"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/practice') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Tekrar Et
            </Link>
          </div>

          {/* Hafta Seçici ve Mobil Menü Butonu */}
          <div className="flex items-center space-x-2">
            {/* Hafta Seçici */}
            <div className="relative flex items-center bg-primary/5 rounded-full px-2 py-1 hover:bg-primary/10 transition-all">
              <button 
                onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                className="p-1 text-primary/70 hover:text-primary transition-colors"
                disabled={selectedWeek === 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="appearance-none bg-transparent text-primary text-sm font-medium px-2 focus:outline-none cursor-pointer min-w-[90px] text-center"
              >
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>
                    Hafta {week}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setSelectedWeek(Math.min(totalWeeks, selectedWeek + 1))}
                className="p-1 text-primary/70 hover:text-primary transition-colors"
                disabled={selectedWeek === totalWeeks}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Mobil Menü Butonu */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-primary/5 transition-all"
              aria-label="Menüyü Aç/Kapat"
            >
              <svg
                className="h-5 w-5 text-primary/70"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobil Menü */}
        <div 
          className={`md:hidden transform transition-all duration-300 ease-in-out ${
            isMenuOpen 
              ? 'max-h-64 opacity-100 translate-y-0' 
              : 'max-h-0 opacity-0 -translate-y-2 overflow-hidden'
          }`}
        >
          <div className="py-2 space-y-1">
            <Link
              href="/"
              onClick={closeMenu}
              className={`block px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Anasayfa
            </Link>
            <Link
              href="/flashcards"
              onClick={closeMenu}
              className={`block px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/flashcards') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Kelime Kartları
            </Link>
            <Link
              href="/quiz"
              onClick={closeMenu}
              className={`block px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/quiz') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Test
            </Link>
            <Link
              href="/practice"
              onClick={closeMenu}
              className={`block px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/practice') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              Tekrar Et
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 