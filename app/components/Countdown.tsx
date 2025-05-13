'use client';

import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

export default function Countdown() {
  const calculateTimeLeft = () => {
    const targetDate = new Date('2025-11-16T10:00:00');
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      };
    }

    return {
      days: 0,
      hours: 0,
      minutes: 0
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000 * 60); // Her dakika güncelle

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 bg-white border-2 border-primary/10 rounded-2xl shadow-lg hover:shadow-xl transition-all">
      <h2 className="text-2xl font-bold text-primary">
        Kasım 2025 YDS'ye Kalan Süre
      </h2>
      
      <div className="flex gap-8">
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-red-600">
            {timeLeft.days}
          </div>
          <div className="text-xl text-base-content/70 mt-2">Gün</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-red-600">
            {timeLeft.hours}
          </div>
          <div className="text-xl text-base-content/70 mt-2">Saat</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-red-600">
            {timeLeft.minutes}
          </div>
          <div className="text-xl text-base-content/70 mt-2">Dakika</div>
        </div>
      </div>

      <p className="text-base-content/70 text-center mt-2">
        16 Kasım 2025, 10:00
      </p>
    </div>
  );
} 