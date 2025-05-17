'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();

  useEffect(() => {
    const weekParam = searchParams.get('week');
    console.log('URL week parametresi:', weekParam);
    if (weekParam) {
      const weekNumber = parseInt(weekParam);
      if (!isNaN(weekNumber) && weekNumber > 0) {
        console.log('Hafta seçiliyor:', weekNumber);
        setSelectedWeek(weekNumber);
      }
    }
  }, [searchParams]);

  const fetchTotalWeeks = async () => {
    try {
      console.log('Toplam hafta sayısı alınıyor...');
      const response = await fetch('/api/words');
      const words = await response.json();
      console.log('Kelimeler alındı:', words);
      
      if (words.length > 0) {
        // Tüm haftaları bir diziye al ve boş olan haftaları da dahil et
        const weeks = words.map((word: any) => word.week);
        const maxWeek = Math.max(...weeks);
        console.log('Maksimum hafta:', maxWeek);
        
        // Eğer maxWeek 1'den büyükse, o sayıyı kullan
        setTotalWeeks(maxWeek > 1 ? maxWeek : 1);
        
        // Eğer seçili hafta maksimum haftadan büyükse, seçili haftayı güncelle
        if (selectedWeek > maxWeek) {
          console.log('Seçili hafta güncelleniyor:', maxWeek);
          setSelectedWeek(maxWeek);
        }
      } else {
        console.log('Kelime bulunamadı, varsayılan değerler ayarlanıyor');
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