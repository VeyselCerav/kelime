'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface WordCardProps {
  english: string;
  turkish: string;
  wordId: number;
  isAuthenticated?: boolean;
  onActionComplete?: () => void;
}

export default function WordCard({ english, turkish, wordId, isAuthenticated, onActionComplete }: WordCardProps) {
  const { data: session } = useSession();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState('');

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const markAsUnlearned = async () => {
    if (!session) {
      setError('Oturum açmanız gerekiyor');
      return;
    }

    setIsMarking(true);
    setError('');

    try {
      // Önce learned-words API'sine istek at
      const learnedResponse = await fetch('/api/learned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wordId,
          isLearned: false 
        }),
        credentials: 'include',
      });

      if (!learnedResponse.ok) {
        throw new Error('Kelime işaretlenirken bir hata oluştu');
      }

      // Sonra unlearned-words API'sine istek at
      const unlearnedResponse = await fetch('/api/unlearned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId }),
        credentials: 'include',
      });

      if (!unlearnedResponse.ok) {
        throw new Error('Kelime ezberlenemeyenler listesine eklenirken bir hata oluştu');
      }

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Kelime işaretleme hatası:', error);
      setError(error instanceof Error ? error.message : 'Kelime işaretlenirken bir hata oluştu');
    } finally {
      setIsMarking(false);
    }
  };

  const markAsLearned = async () => {
    if (!session) {
      setError('Oturum açmanız gerekiyor');
      return;
    }

    setIsMarking(true);
    setError('');

    try {
      const response = await fetch('/api/learned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wordId,
          isLearned: true 
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kelime işaretlenirken bir hata oluştu');
      }

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Kelime işaretleme hatası:', error);
      setError(error instanceof Error ? error.message : 'Kelime işaretlenirken bir hata oluştu');
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="relative w-full h-64">
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleFlip}
      >
        <div className="absolute w-full h-full bg-white rounded-xl shadow-lg p-6 backface-hidden">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-2xl font-bold text-center text-gray-900">
              {english}
            </h3>
          </div>
        </div>
        <div className="absolute w-full h-full bg-indigo-600 text-white rounded-xl shadow-lg p-6 backface-hidden rotate-y-180">
          <h3 className="text-2xl font-bold text-center">{turkish}</h3>
        </div>
      </div>

      {session && isAuthenticated && (
        <div className="absolute top-2 right-2 left-2 flex justify-between z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAsUnlearned();
            }}
            disabled={isMarking}
            className={`p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors ${
              isMarking ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Ezberleyemedim"
          >
            {isMarking ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" />
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAsLearned();
            }}
            disabled={isMarking}
            className={`p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors ${
              isMarking ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Ezberledim"
          >
            {isMarking ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="absolute bottom-2 left-2 right-2 text-sm text-center text-red-600 bg-white/90 rounded-md p-2 shadow-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-800 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
} 