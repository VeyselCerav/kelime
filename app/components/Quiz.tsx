'use client';

import { useState } from 'react';

interface QuizProps {
  questions: {
    id: number;
    question: string;
    options: string[];
    answer: string;
    wordId: number;
  }[];
  isAuthenticated?: boolean;
}

interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
}

export default function Quiz({ questions, isAuthenticated }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState<QuizResult>({
    totalQuestions: questions.length,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0
  });

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    // Doğru/yanlış cevap sayısını güncelle
    const isCorrect = answer === currentQuestion.answer;
    setResults(prev => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      wrongAnswers: !isCorrect ? prev.wrongAnswers + 1 : prev.wrongAnswers,
      score: isCorrect ? prev.score + (100 / questions.length) : prev.score
    }));

    if (!isAuthenticated) {
      setError('');
      return;
    }

    try {
      setError('');
      const response = await fetch('/api/learned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wordId: currentQuestion.wordId,
          isLearned: isCorrect
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kelime işaretlenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('İşlem sırasında hata:', error);
      setError(error instanceof Error ? error.message : 'Bir hata oluştu');
    }
  };

  const handleNext = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= questions.length) {
      setQuizCompleted(true);
      return;
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
      totalQuestions: questions.length,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0
    });
  };

  const markAsUnlearned = async () => {
    if (!isAuthenticated) return;

    setIsMarking(true);
    setError('');

    try {
      const learnedResponse = await fetch('/api/learned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wordId: currentQuestion.wordId,
          isLearned: false 
        }),
        credentials: 'include',
      });

      if (!learnedResponse.ok) {
        throw new Error('Kelime işaretlenirken bir hata oluştu');
      }

      const unlearnedResponse = await fetch('/api/unlearned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId: currentQuestion.wordId }),
        credentials: 'include',
      });

      if (!unlearnedResponse.ok) {
        throw new Error('Kelime ezberlenemeyenler listesine eklenirken bir hata oluştu');
      }
    } catch (error) {
      setError('Kelime işaretlenirken bir hata oluştu');
      console.error('Kelime işaretleme hatası:', error);
    } finally {
      setIsMarking(false);
    }
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
            Soru {currentQuestionIndex + 1} / {questions.length}
          </h2>
          <div className="text-sm text-gray-600">
            Doğru: {results.correctAnswers} | Yanlış: {results.wrongAnswers}
          </div>
        </div>
        <p className="text-xl mt-4">{currentQuestion.question}</p>
      </div>

      <div className="space-y-4">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(option)}
            disabled={isAnswered}
            className={`w-full p-4 text-left rounded-lg transition-colors ${
              isAnswered
                ? option === currentQuestion.answer
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

      <div className="mt-8 flex justify-between items-center">
        {isAuthenticated && isAnswered && (
          <button
            onClick={markAsUnlearned}
            disabled={isMarking}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {isMarking ? 'Ekleniyor...' : 'Ezberleyemedim'}
          </button>
        )}

        {isAnswered && (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 