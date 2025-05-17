'use client';

import { useState } from 'react';

interface Word {
  id: number;
  english: string;
  turkish: string;
}

interface UnlearnedWord {
  id: number;
  word: Word;
}

interface UnlearnedQuizProps {
  unlearnedWords: UnlearnedWord[];
  onRemoveWord: (wordId: number) => void;
  isAuthenticated?: boolean;
}

interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
}

export default function UnlearnedQuiz({ unlearnedWords, onRemoveWord, isAuthenticated }: UnlearnedQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [error, setError] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState<QuizResult>({
    totalQuestions: unlearnedWords.length,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0
  });

  const currentWord = unlearnedWords[currentQuestionIndex].word;

  // Her soru için 3 yanlış cevap seç
  const getRandomOptions = () => {
    const otherWords = unlearnedWords
      .filter(uw => uw.word.id !== currentWord.id)
      .map(uw => uw.word.turkish);
    
    const wrongAnswers = [...otherWords]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [...wrongAnswers];
    const correctAnswerIndex = Math.floor(Math.random() * 4);
    options.splice(correctAnswerIndex, 0, currentWord.turkish);

    return options;
  };

  const options = getRandomOptions();

  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    // Doğru/yanlış cevap sayısını güncelle
    const isCorrect = answer === currentWord.turkish;
    setResults(prev => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      wrongAnswers: !isCorrect ? prev.wrongAnswers + 1 : prev.wrongAnswers,
      score: isCorrect ? prev.score + (100 / unlearnedWords.length) : prev.score
    }));

    // Oturum açmamış kullanıcılar için API çağrısı yapma
    if (!isAuthenticated) {
      setError('');
      return;
    }

    if (answer === currentWord.turkish) {
      try {
        setError('');
        // Kelimeyi öğrenildi olarak işaretle
        const learnedResponse = await fetch('/api/learned-words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            wordId: currentWord.id,
            isLearned: true 
          }),
          credentials: 'include',
        });

        if (!learnedResponse.ok) {
          const errorData = await learnedResponse.json();
          throw new Error(errorData.error || 'Kelime işaretlenirken bir hata oluştu');
        }

        // Kelimeyi ezberlenemeyenler listesinden kaldır
        await onRemoveWord(currentWord.id);
      } catch (error) {
        console.error('İlerleme güncellenirken hata:', error);
        setError(error instanceof Error ? error.message : 'Bir hata oluştu');
      }
    } else {
      try {
        setError('');
        // Yanlış cevap verildiğinde kelimeyi ezberlenemeyenler listesine ekle
        const unlearnedResponse = await fetch('/api/unlearned-words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wordId: currentWord.id }),
          credentials: 'include',
        });

        if (!unlearnedResponse.ok) {
          const errorData = await unlearnedResponse.json();
          throw new Error(errorData.error || 'Kelime ezberlenemeyenler listesine eklenirken bir hata oluştu');
        }
      } catch (error) {
        console.error('Ezberlenemeyenler listesine ekleme hatası:', error);
        setError(error instanceof Error ? error.message : 'Bir hata oluştu');
      }
    }
  };

  const handleNext = async () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= unlearnedWords.length) {
      setQuizCompleted(true);
      return;
    }

    if (!isAuthenticated) {
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCurrentQuestionIndex(nextIndex);
      return;
    }

    if (selectedAnswer === currentWord.turkish) {
      try {
        setError('');
        // Kelimeyi öğrenildi olarak işaretle
        const response = await fetch('/api/learned-words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            wordId: currentWord.id,
            isLearned: true 
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Kelime işaretlenirken bir hata oluştu');
        }

        // Kelimeyi listeden kaldır
        await onRemoveWord(currentWord.id);
      } catch (error) {
        console.error('İlerleme güncellenirken hata:', error);
        setError(error instanceof Error ? error.message : 'Bir hata oluştu');
      }
    }

    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentQuestionIndex(nextIndex);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizCompleted(false);
    setResults({
      totalQuestions: unlearnedWords.length,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0
    });
  };

  if (quizCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Sonuçları</h2>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Toplam Soru:</span>
            <span className="font-semibold">{results.totalQuestions}</span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <span className="text-green-700">Doğru Cevap:</span>
            <span className="font-semibold text-green-700">{results.correctAnswers}</span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
            <span className="text-red-700">Yanlış Cevap:</span>
            <span className="font-semibold text-red-700">{results.wrongAnswers}</span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
            <span className="text-indigo-700">Başarı Puanı:</span>
            <span className="font-semibold text-indigo-700">%{Math.round(results.score)}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleRestartQuiz}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Testi Yeniden Başlat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Soru {currentQuestionIndex + 1} / {unlearnedWords.length}
          </h2>
          <div className="text-sm text-gray-600">
            Doğru: {results.correctAnswers} | Yanlış: {results.wrongAnswers}
          </div>
        </div>
        <p className="text-xl mt-4">
          &quot;{currentWord.english}&quot; kelimesinin Türkçe anlamı nedir?
        </p>
      </div>

      <div className="space-y-4">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(option)}
            disabled={isAnswered}
            className={`w-full p-4 text-left rounded-lg transition-colors ${
              isAnswered
                ? option === currentWord.turkish
                  ? 'bg-green-100 text-green-800'
                  : option === selectedAnswer
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {currentQuestionIndex === unlearnedWords.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 