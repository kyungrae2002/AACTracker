'use client';

import { useState, useRef, useCallback } from 'react';

export const useHoverProgress = () => {
  const [hoverProgress, setHoverProgress] = useState<Record<string, number>>({});
  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  const handleButtonHoverStart = useCallback((buttonId: string) => {
    if (hoverTimerRef.current[buttonId]) {
      clearInterval(hoverTimerRef.current[buttonId]!);
    }

    hoverTimerRef.current[buttonId] = setInterval(() => {
      setHoverProgress((prev) => {
        const currentProgress = prev[buttonId] || 0;
        const newProgress = Math.min(currentProgress + 1.6, 100);

        if (newProgress >= 100 && currentProgress < 100) {
          // Trigger selection callback will be handled externally
          return { ...prev, [buttonId]: 100 };
        }

        return { ...prev, [buttonId]: newProgress };
      });
    }, 16);
  }, []);

  const handleButtonHoverEnd = useCallback((buttonId: string) => {
    if (hoverTimerRef.current[buttonId]) {
      clearInterval(hoverTimerRef.current[buttonId]!);
      hoverTimerRef.current[buttonId] = null;
    }

    const fadeTimer = setInterval(() => {
      setHoverProgress((prev) => {
        const currentProgress = prev[buttonId] || 0;
        const newProgress = Math.max(currentProgress - 6.4, 0);

        if (newProgress <= 0) {
          clearInterval(fadeTimer);
        }

        return { ...prev, [buttonId]: newProgress };
      });
    }, 16);
  }, []);

  const resetProgress = useCallback(() => {
    setHoverProgress({});
    Object.values(hoverTimerRef.current).forEach((timer) => {
      if (timer) clearInterval(timer);
    });
    hoverTimerRef.current = {};
  }, []);

  const cleanup = useCallback(() => {
    Object.values(hoverTimerRef.current).forEach((timer) => {
      if (timer) clearInterval(timer);
    });
  }, []);

  return {
    hoverProgress,
    handleButtonHoverStart,
    handleButtonHoverEnd,
    resetProgress,
    cleanup
  };
};