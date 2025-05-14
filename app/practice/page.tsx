'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';
import Link from 'next/link';

interface Word {
  id: string;
  english: string;
  turkish: string;
  week: number;
}

export default function Practice() {
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [wordCount, setWordCount] = useState<number>(10);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { totalWeeks } = useWeek();

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error('Kelimeler yüklenirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekToggle = (week: number) => {
    setSelectedWeeks(prev =>
      prev.includes(week)
        ? prev.filter(w => w !== week)
        : [...prev, week]
    );
  };

  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setWordCount(value);
    }
  };

  const getRandomWords = () => {
    // Seçili haftalardaki kelimeleri filtrele
    const filteredWords = words.filter(word => selectedWeeks.includes(word.week));
    
    // Rastgele kelime seç
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(wordCount, shuffled.length));
  };

  const startFlashcards = () => {
    const selectedWords = getRandomWords();
    localStorage.setItem('practiceWords', JSON.stringify(selectedWords));
    window.location.href = '/flashcards?mode=practice';
  };

  const startQuiz = () => {
    const selectedWords = getRandomWords();
    localStorage.setItem('practiceWords', JSON.stringify(selectedWords));
    window.location.href = '/quiz?mode=practice';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-base-content/70">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
          Tekrar Et
        </h1>

        <div className="card bg-white border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all rounded-2xl">
          <div className="card-body p-8">
            <div className="space-y-8">
              {/* Hafta Seçimi */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Haftaları Seç</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                    <button
                      key={week}
                      onClick={() => handleWeekToggle(week)}
                      className={`relative btn ${
                        selectedWeeks.includes(week)
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-white text-base-content/70 border-base-300'
                      } border-2 rounded-xl hover:shadow-md transition-all h-12`}
                    >
                      Hafta {week}
                      {selectedWeeks.includes(week) && (
                        <svg 
                          className="absolute top-1 right-1 w-4 h-4 text-primary"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kelime Sayısı */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Kelime Sayısı</h2>
                <input
                  type="number"
                  value={wordCount}
                  onChange={handleWordCountChange}
                  min="1"
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                />
              </div>

              {/* Çalışma Tipi Seçimi */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Çalışma Tipini Seç</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={startFlashcards}
                    disabled={selectedWeeks.length === 0}
                    className={`btn h-auto py-6 ${
                      selectedWeeks.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-primary hover:bg-primary/5 border-2 border-primary/20'
                    } rounded-xl hover:shadow-lg transition-all`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Kelime Kartları</span>
                    </div>
                  </button>

                  <button
                    onClick={startQuiz}
                    disabled={selectedWeeks.length === 0}
                    className={`btn h-auto py-6 ${
                      selectedWeeks.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-primary hover:bg-primary/5 border-2 border-primary/20'
                    } rounded-xl hover:shadow-lg transition-all`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>Test</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 