'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';

interface Word {
  id: number;
  english: string;
  turkish: string;
  week: number;
}

interface Question {
  word: string;
  options: string[];
  correctAnswer: string;
}

export default function Quiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const { selectedWeek } = useWeek();

  useEffect(() => {
    fetchWords();
  }, [selectedWeek]);

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      const allWords: Word[] = await response.json();
      
      const weekWords = allWords.filter(word => word.week === selectedWeek);
      
      if (weekWords.length < 4) {
        setIsLoading(false);
        setQuestions([]);
        return;
      }

      const generatedQuestions = generateQuestions(weekWords, allWords);
      setQuestions(generatedQuestions);
      setIsLoading(false);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setSelectedAnswer(null);
      setShowCorrectAnswer(false);
    } catch (error) {
      console.error('Kelimeler yüklenirken hata oluştu:', error);
      setIsLoading(false);
    }
  };

  const generateQuestions = (weekWords: Word[], allWords: Word[]): Question[] => {
    const shuffledWords = [...weekWords].sort(() => Math.random() - 0.5);
    return shuffledWords.map((word) => {
      const otherWords = allWords.filter(w => w.id !== word.id);
      const wrongAnswers = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.turkish);

      const options = [...wrongAnswers];
      const correctAnswerIndex = Math.floor(Math.random() * 4);
      options.splice(correctAnswerIndex, 0, word.turkish);

      return {
        word: word.english,
        options,
        correctAnswer: word.turkish
      };
    });
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowCorrectAnswer(true);
  };

  const handleNext = () => {
    if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowCorrectAnswer(false);
    } else {
      setShowResult(true);
    }
  };

  const restartQuiz = () => {
    fetchWords();
  };

  const getButtonStyle = (option: string) => {
    if (!showCorrectAnswer) {
      return selectedAnswer === option
        ? 'border-primary text-primary shadow-lg'
        : 'border-base-300 text-base-content hover:border-primary/30 hover:shadow-md';
    }

    if (option === questions[currentQuestionIndex].correctAnswer) {
      return 'border-green-500 bg-green-50 text-green-700 shadow-lg';
    }

    if (selectedAnswer === option && option !== questions[currentQuestionIndex].correctAnswer) {
      return 'border-red-500 bg-red-50 text-red-700 shadow-lg';
    }

    return 'border-base-300 text-base-content/50';
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
          Hafta {selectedWeek} - Kelime Testi
        </h1>
        <p className="text-base-content/70">
          Bu haftaya ait yeterli kelime yok. Test için en az 4 kelime gerekiyor.
        </p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 min-h-[60vh]">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Hafta {selectedWeek} - Test Sonucu
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
          Testi Tekrar Çöz
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Hafta {selectedWeek} - Kelime Testi
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
                  className={`btn bg-white border-2 transition-all ${getButtonStyle(option)} rounded-xl py-4`}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showCorrectAnswer}
                >
                  {option}
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