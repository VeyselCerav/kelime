'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface WeekContextType {
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  totalWeeks: number;
  refreshWeeks: () => Promise<void>;
}

const WeekContext = createContext<WeekContextType | undefined>(undefined);

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(1);

  const fetchTotalWeeks = async () => {
    try {
      const response = await fetch('/api/words');
      const words = await response.json();
      if (words.length > 0) {
        const maxWeek = Math.max(...words.map((word: any) => word.week));
        setTotalWeeks(maxWeek);
        // Eğer seçili hafta maksimum haftadan büyükse, seçili haftayı güncelle
        if (selectedWeek > maxWeek) {
          setSelectedWeek(maxWeek);
        }
      } else {
        setTotalWeeks(1);
        setSelectedWeek(1);
      }
    } catch (error) {
      console.error('Hafta sayısı alınırken hata oluştu:', error);
    }
  };

  // Başlangıçta ve her 30 saniyede bir güncelle
  useEffect(() => {
    fetchTotalWeeks();
    const interval = setInterval(fetchTotalWeeks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Admin panelinden kelime eklendiğinde manuel güncelleme için
  const refreshWeeks = async () => {
    await fetchTotalWeeks();
  };

  return (
    <WeekContext.Provider value={{ 
      selectedWeek, 
      setSelectedWeek, 
      totalWeeks,
      refreshWeeks 
    }}>
      {children}
    </WeekContext.Provider>
  );
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (context === undefined) {
    throw new Error('useWeek must be used within a WeekProvider');
  }
  return context;
} 