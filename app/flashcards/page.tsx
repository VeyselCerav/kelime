'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';

interface Word {
  id: number;
  english: string;
  turkish: string;
  week: number;
}

export default function FlashCards() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const { selectedWeek } = useWeek();

  useEffect(() => {
    fetchWords();
  }, [selectedWeek]);

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      const data = await response.json();
      // Seçili haftaya göre kelimeleri filtrele
      const filteredWords = data.filter((word: Word) => word.week === selectedWeek);
      setWords(filteredWords);
      setCurrentWordIndex(0); // Yeni hafta seçildiğinde ilk kelimeden başla
      setIsFlipped(false); // Kartı ters çevirme durumunu sıfırla
    } catch (error) {
      console.error('Kelimeler yüklenirken hata oluştu:', error);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const nextCard = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setIsFlipped(false);
    }
  };

  const previousCard = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
      setIsFlipped(false);
    }
  };

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Kelime Kartları
        </h1>
        <p className="text-base-content/70">Bu haftaya ait kelime bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-12 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Hafta {selectedWeek} - Kelime Kartları
        </h1>
        <p className="mt-2 text-base-content/70">Kartı çevirmek için üzerine tıklayın</p>
      </div>
      
      <div 
        className="relative w-96 h-60 cursor-pointer perspective-1000 group" 
        onClick={flipCard}
      >
        <div 
          className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          <div className="absolute w-full h-full bg-white border-2 border-primary/20 text-primary rounded-2xl flex items-center justify-center p-8 backface-hidden shadow-lg hover:shadow-xl transition-all">
            <span className="text-3xl font-bold">{words[currentWordIndex].english}</span>
          </div>
          <div className="absolute w-full h-full bg-white border-2 border-secondary/20 text-secondary rounded-2xl flex items-center justify-center p-8 backface-hidden rotate-y-180 shadow-lg hover:shadow-xl transition-all">
            <span className="text-3xl font-bold">{words[currentWordIndex].turkish}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <button 
          className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl px-8 hover:shadow-lg transition-all"
          onClick={previousCard}
          disabled={currentWordIndex === 0}
        >
          Önceki
        </button>
        <button 
          className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl px-8 hover:shadow-lg transition-all"
          onClick={nextCard}
          disabled={currentWordIndex === words.length - 1}
        >
          Sonraki
        </button>
      </div>

      <div className="text-base-content/50 font-medium">
        {currentWordIndex + 1} / {words.length}
      </div>
    </div>
  );
} 