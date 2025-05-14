'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';
import { useSearchParams } from 'next/navigation';

interface Word {
  id: string;
  english: string;
  turkish: string;
  week: number;
}

interface Question {
  word: string;
  correctAnswer: string;
  options: string[];
}

export default function Quiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedWeek } = useWeek();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (mode === 'practice') {
      // Practice modunda localStorage'dan kelimeleri al
      const practiceWords = localStorage.getItem('practiceWords');
      if (practiceWords) {
        prepareQuestions(JSON.parse(practiceWords));
      }
    } else {
      // Normal modda API'den kelimeleri al
      fetchWords();
    }
  }, [selectedWeek, mode]);

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      const data = await response.json();
      // Seçili haftaya göre kelimeleri filtrele
      const filteredWords = data.filter((word: Word) => word.week === selectedWeek);
      prepareQuestions(filteredWords);
    } catch (error) {
      console.error('Kelimeler yüklenirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareQuestions = (words: Word[]) => {
    if (words.length < 4) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }

    const preparedQuestions = words.map(word => {
      // Her soru için 3 yanlış cevap seç
      const otherWords = words.filter(w => w.id !== word.id);
      const wrongAnswers = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.turkish);

      // Doğru cevabı rastgele bir pozisyona ekle
      const options = [...wrongAnswers];
      const correctAnswerIndex = Math.floor(Math.random() * 4);
      options.splice(correctAnswerIndex, 0, word.turkish);

      return {
        word: word.english,
        correctAnswer: word.turkish,
        options
      };
    });

    setQuestions(preparedQuestions);
    setIsLoading(false);
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowCorrectAnswer(true);

    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex === questions.length - 1) {
      setShowResult(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowCorrectAnswer(false);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShowCorrectAnswer(false);
    setScore(0);
    setShowResult(false);
    if (mode === 'practice') {
      window.location.href = '/practice';
    }
  };

  const getButtonStyle = (option: string) => {
    if (!showCorrectAnswer) {
      return 'hover:bg-primary/5 hover:border-primary/30';
    }
    
    if (option === questions[currentQuestionIndex].correctAnswer) {
      return 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100';
    }
    
    if (option === selectedAnswer && option !== questions[currentQuestionIndex].correctAnswer) {
      return 'bg-red-50 border-red-500 text-red-700';
    }
    
    return 'opacity-50';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-base-content/70">Yükleniyor...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {mode === 'practice' ? 'Tekrar - Test' : `Hafta ${selectedWeek} - Kelime Testi`}
        </h1>
        <p className="text-base-content/70">
          {mode === 'practice'
            ? 'Lütfen önce Tekrar Et sayfasından kelime seçin.'
            : 'Bu haftaya ait yeterli kelime yok. Test için en az 4 kelime gerekiyor.'
          }
        </p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 min-h-[60vh]">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {mode === 'practice' ? 'Tekrar - Test Sonucu' : `Hafta ${selectedWeek} - Test Sonucu`}
        </h2>
        <div className="text-xl text-base-content/80">
          Toplam {questions.length} sorudan {score} tanesini doğru cevapladınız.
        </div>
        <div className="text-3xl font-bold text-primary">
          Başarı Oranı: {Math.round((score / questions.length) * 100)}%
        </div>
        <button 
          className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl px-8 hover:shadow-lg transition-all"
          onClick={restartQuiz}
        >
          {mode === 'practice' ? 'Yeni Tekrar' : 'Testi Tekrar Çöz'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {mode === 'practice' ? 'Tekrar - Test' : `Hafta ${selectedWeek} - Kelime Testi`}
      </h1>
      
      <div className="w-full max-w-2xl">
        <div className="card bg-white border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all rounded-2xl">
          <div className="card-body p-8">
            <div className="text-base-content/50 font-medium mb-4">
              Soru {currentQuestionIndex + 1}/{questions.length}
            </div>
            <p className="text-2xl font-medium mb-8 text-base-content">
              &quot;{questions[currentQuestionIndex].word}&quot; kelimesinin Türkçe anlamı nedir?
            </p>
            <div className="grid grid-cols-1 gap-4">
              {questions[currentQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  className={`relative btn bg-white border-2 transition-all ${getButtonStyle(option)} rounded-xl py-4`}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showCorrectAnswer}
                >
                  <span>{option}</span>
                  {showCorrectAnswer && option === questions[currentQuestionIndex].correctAnswer && (
                    <svg 
                      className="absolute right-4 w-6 h-6 text-green-600" 
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
                  {showCorrectAnswer && option === selectedAnswer && option !== questions[currentQuestionIndex].correctAnswer && (
                    <svg 
                      className="absolute right-4 w-6 h-6 text-red-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
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
              ))}
            </div>
            <div className="card-actions justify-end mt-8">
              <button
                className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl px-8 hover:shadow-lg transition-all"
                onClick={handleNext}
                disabled={!selectedAnswer}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 