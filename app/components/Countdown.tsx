'use client';

import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
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
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    }

    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000); // Her saniye güncelle

    return () => clearInterval(timer);
  }, []);

  // Hydration hatalarını önlemek için
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 bg-white border-2 border-primary/10 rounded-2xl shadow-lg hover:shadow-xl transition-all">
      <h2 className="text-2xl font-bold text-primary">
        Kasım 2025 YDS'ye Kalan Süre
      </h2>
      
      <div className="flex gap-4 md:gap-8">
        <div className="flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-bold text-red-600">
            {timeLeft.days}
          </div>
          <div className="text-lg md:text-xl text-base-content/70 mt-2">Gün</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-bold text-red-600">
            {timeLeft.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-lg md:text-xl text-base-content/70 mt-2">Saat</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-bold text-red-600">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-lg md:text-xl text-base-content/70 mt-2">Dakika</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-bold text-red-600">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-lg md:text-xl text-base-content/70 mt-2">Saniye</div>
        </div>
      </div>

      <p className="text-base-content/70 text-center mt-2">
        16 Kasım 2025, 10:00
      </p>
    </div>
  );
} 