'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import WordCard from '../components/WordCard';

interface Word {
  id: string;
  english: string;
  turkish: string;
  week: number;
}

export default function FlashCards() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  const { selectedWeek } = useWeek();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (mode === 'practice') {
      // Practice modunda localStorage'dan kelimeleri al
      const practiceWords = localStorage.getItem('practiceWords');
      if (practiceWords) {
        setWords(JSON.parse(practiceWords));
      }
      setIsLoading(false);
    } else {
      // Normal modda API'den kelimeleri al
      fetchWords();
    }
  }, [selectedWeek, mode]);

  const fetchWords = async () => {
    try {
      console.log('Kelimeler getiriliyor... Seçili hafta:', selectedWeek);
      const response = await fetch('/api/words');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kelimeler alınırken bir hata oluştu');
      }
      
      const data = await response.json();
      console.log('Tüm kelimeler:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('API yanıtı geçerli bir kelime listesi değil');
      }
      
      // Seçili haftaya göre kelimeleri filtrele
      const filteredWords = data.filter((word: Word) => {
        console.log('Kelime haftası kontrolü:', word.week, selectedWeek, word.week === selectedWeek);
        return word.week === selectedWeek;
      });
      
      console.log('Filtrelenmiş kelimeler:', filteredWords);
      
      setWords(filteredWords);
      setCurrentWordIndex(0); // Yeni hafta seçildiğinde ilk kelimeden başla
    } catch (error) {
      console.error('Kelimeler yüklenirken detaylı hata:', error);
      setError(error instanceof Error ? error.message : 'Kelimeler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const previousCard = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Kelime Kartları
        </h1>
        <p className="text-base-content/70">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Kelime Kartları
        </h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Kelime Kartları
        </h1>
        <p className="text-base-content/70">
          {mode === 'practice' 
            ? 'Lütfen önce Tekrar Et sayfasından kelime seçin.'
            : 'Bu haftaya ait kelime bulunmamaktadır.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-12 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {mode === 'practice' ? 'Tekrar - Kelime Kartları' : `Hafta ${selectedWeek} - Kelime Kartları`}
        </h1>
        <p className="mt-2 text-base-content/70">Kartı çevirmek için üzerine tıklayın</p>
      </div>
      
      <div className="w-96">
        <WordCard
          english={words[currentWordIndex].english}
          turkish={words[currentWordIndex].turkish}
          wordId={parseInt(words[currentWordIndex].id)}
          isAuthenticated={!!session}
          onActionComplete={nextCard}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={previousCard}
          disabled={currentWordIndex === 0}
          className={`btn ${
            currentWordIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-primary hover:bg-primary/5 border-2 border-primary/20'
          } rounded-xl hover:shadow-lg transition-all px-6`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-base-content/70">
          {currentWordIndex + 1} / {words.length}
        </span>

        <button
          onClick={nextCard}
          disabled={currentWordIndex === words.length - 1}
          className={`btn ${
            currentWordIndex === words.length - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-primary hover:bg-primary/5 border-2 border-primary/20'
          } rounded-xl hover:shadow-lg transition-all px-6`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
} 