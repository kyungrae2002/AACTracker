'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import IrisTracker from '@/components/IrisTracker';
import AALayout from '@/components/AALayout';
import SelectionButton from '@/components/SelectionButton';
import { categories, subjects, predicates, buildSentence, WordOption } from '@/data/wordData';
import { getEnhancedSentence } from '@/lib/openai';

type SelectionStep = 'category' | 'subject' | 'predicate' | 'complete';

export default function MainPage() {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPredicate, setSelectedPredicate] = useState<string>('');
  const [blinkMode, setBlinkMode] = useState<'single' | 'double'>('single');
  const [isDesktop, setIsDesktop] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [enhancedSentence, setEnhancedSentence] = useState<string>('');
  const [finalSentence, setFinalSentence] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const handleSelectionRef = useRef<((buttonId: string) => void) | null>(null);

  // 클라이언트 마운트 및 윈도우 크기 초기화
  useEffect(() => {
    setIsMounted(true);
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
      setIsDesktop(width >= 1900 && height >= 1000);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 현재 단계에 따른 전체 옵션 가져오기
  const getAllOptions = useCallback((): WordOption[] => {
    switch (currentStep) {
      case 'category':
        return categories.slice(0, 4);
      case 'subject':
        return subjects;
      case 'predicate':
        return predicates[selectedCategory] || [];
      default:
        return [];
    }
  }, [currentStep, selectedCategory]);

  // 현재 페이지에 표시할 옵션 가져오기 (최대 4개)
  const getCurrentPageOptions = useCallback((): WordOption[] => {
    const allOptions = getAllOptions();

    if (currentStep === 'category') {
      return allOptions;
    }

    const startIdx = currentPage * 4;
    return allOptions.slice(startIdx, startIdx + 4);
  }, [getAllOptions, currentPage, currentStep]);

  // "다시" 버튼을 표시할지 확인
  const showNextButton = useCallback((): boolean => {
    if (currentStep === 'category') return false;
    const allOptions = getAllOptions();
    return allOptions.length > 4;
  }, [getAllOptions, currentStep]);

  // 선택 초기화
  const resetSelection = useCallback(() => {
    setCurrentStep('category');
    setSelectedCategory('');
    setSelectedSubject('');
    setSelectedPredicate('');
    setHoverProgress({});
    setCurrentPage(0);
    setEnhancedSentence('');
    setFinalSentence('');
    setIsGenerating(false);
  }, []);

  // 선택 처리
  useEffect(() => {
    handleSelectionRef.current = (buttonId: string) => {
      if (buttonId === 'next_page') {
        const allOptions = getAllOptions();
        const nextPageStart = (currentPage + 1) * 4;

        if (nextPageStart >= allOptions.length) {
          setCurrentPage(0);
        } else {
          setCurrentPage(prev => prev + 1);
        }
        setHoverProgress({});
        return;
      }

      switch (currentStep) {
        case 'category':
          setSelectedCategory(buttonId);
          setCurrentStep('subject');
          setHoverProgress({});
          setCurrentPage(0);
          break;
        case 'subject':
          setSelectedSubject(buttonId);
          setCurrentStep('predicate');
          setHoverProgress({});
          setCurrentPage(0);
          break;
        case 'predicate':
          setSelectedPredicate(buttonId);
          setHoverProgress({});

          // GPT API를 통해 문장 개선
          const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label || '';
          const predicateLabel = predicates[selectedCategory]?.find(p => p.id === buttonId)?.label || '';
          const originalSentence = buildSentence(selectedSubject, buttonId, selectedCategory);

          // 즉시 원본 문장을 표시하고 생성 중 상태로 변경
          setFinalSentence(originalSentence);
          setIsGenerating(true);

          // GPT API 호출 (비동기로 처리)
          getEnhancedSentence(subjectLabel, predicateLabel, selectedCategory, originalSentence)
            .then((enhanced) => {
              console.log('✅ GPT 응답 수신:', enhanced);
              setFinalSentence(enhanced);
              setIsGenerating(false);

              // GPT 응답 후 3초 대기 후 초기화
              setTimeout(() => {
                resetSelection();
              }, 3000);
            })
            .catch((error) => {
              console.error('❌ GPT 문장 생성 실패:', error);
              setIsGenerating(false);

              // 실패해도 3초 후 초기화
              setTimeout(() => {
                resetSelection();
              }, 3000);
            });
          break;
      }
    };
  }, [currentStep, currentPage, getAllOptions, resetSelection, selectedCategory, selectedSubject]);

  // 버튼 호버 시작
  const handleButtonHoverStart = useCallback((buttonId: string) => {
    if (hoverTimerRef.current[buttonId]) {
      clearInterval(hoverTimerRef.current[buttonId]!);
    }

    const intervalTime = 16;
    const duration = 1000;
    const incrementPerFrame = (100 / duration) * intervalTime;

    hoverTimerRef.current[buttonId] = setInterval(() => {
      setHoverProgress((prev) => {
        const currentProgress = prev[buttonId] || 0;
        const newProgress = Math.min(currentProgress + incrementPerFrame, 100);

        if (newProgress >= 100 && currentProgress < 100) {
          if (handleSelectionRef.current) {
            handleSelectionRef.current(buttonId);
          }
        }

        return { ...prev, [buttonId]: newProgress };
      });
    }, intervalTime);
  }, []);

  // 버튼 호버 종료
  const handleButtonHoverEnd = useCallback((buttonId: string) => {
    if (hoverTimerRef.current[buttonId]) {
      clearInterval(hoverTimerRef.current[buttonId]!);
      hoverTimerRef.current[buttonId] = null;
    }

    const intervalTime = 16;
    const duration = 500;
    const decrementPerFrame = (100 / duration) * intervalTime;

    const fadeTimer = setInterval(() => {
      setHoverProgress((prev) => {
        const currentProgress = prev[buttonId] || 0;
        const newProgress = Math.max(currentProgress - decrementPerFrame, 0);

        if (newProgress <= 0) {
          clearInterval(fadeTimer);
        }

        return { ...prev, [buttonId]: newProgress };
      });
    }, intervalTime);
  }, []);

  // 시선 추적으로 버튼 감지
  useEffect(() => {
    if (!isMounted) return;

    let lastHoveredButton: string | null = null;

    const checkCursorOverButtons = () => {
      const gazeCursor = document.getElementById('gaze-tracking-cursor');
      if (!gazeCursor) return;

      const style = window.getComputedStyle(gazeCursor);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      const cursorRect = gazeCursor.getBoundingClientRect();
      const cursorX = cursorRect.left + cursorRect.width / 2;
      const cursorY = cursorRect.top + cursorRect.height / 2;

      const currentOptions = getCurrentPageOptions();
      const allButtons = showNextButton()
        ? [...currentOptions, { id: 'next_page', label: '다시' }]
        : currentOptions;

      let anyButtonHovered = false;

      allButtons.forEach((option) => {
        const button = buttonRefs.current[option.id];
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const isOver =
          cursorX >= rect.left &&
          cursorX <= rect.right &&
          cursorY >= rect.top &&
          cursorY <= rect.bottom;

        if (isOver) {
          anyButtonHovered = true;
          if (lastHoveredButton !== option.id) {
            if (lastHoveredButton) {
              handleButtonHoverEnd(lastHoveredButton);
            }
            handleButtonHoverStart(option.id);
            lastHoveredButton = option.id;
          }
        }
      });

      if (!anyButtonHovered && lastHoveredButton) {
        handleButtonHoverEnd(lastHoveredButton);
        lastHoveredButton = null;
      }
    };

    const intervalId = setInterval(checkCursorOverButtons, 16);

    return () => {
      clearInterval(intervalId);
      Object.values(hoverTimerRef.current).forEach((timer) => {
        if (timer) clearInterval(timer);
      });
    };
  }, [currentStep, isMounted, getCurrentPageOptions, handleButtonHoverStart, handleButtonHoverEnd, showNextButton]);

  // 실시간 문장 생성 (완성된 문장이 있으면 그것을 표시)
  const currentSentence = useMemo(() => {
    // GPT가 생성 중일 때
    if (isGenerating) {
      return "GPT가 문장을 생성하는 중입니다...";
    }
    // finalSentence가 있으면 완성된 문장 표시
    if (finalSentence) {
      return finalSentence;
    }
    // 아니면 현재까지 선택된 단어들로 문장 생성
    return buildSentence(selectedSubject, selectedPredicate, selectedCategory);
  }, [selectedSubject, selectedPredicate, selectedCategory, finalSentence, isGenerating]);

  // 버튼 레이아웃 스타일
  const buttonContainerStyle = useMemo(() => {
    if (!isMounted || windowSize.width === 0) {
      return {
        left: '56px',
        top: '150px',
        gap: '25px',
        buttonWidth: 300,
      };
    }

    const currentOptions = getCurrentPageOptions();
    const hasNext = showNextButton();
    const buttonCount = hasNext ? currentOptions.length + 1 : currentOptions.length;
    const screenWidth = windowSize.width;

    let buttonWidth: number;
    if (buttonCount === 4) {
      buttonWidth = screenWidth / 5;
    } else if (buttonCount === 5) {
      buttonWidth = screenWidth / 6;
    } else {
      buttonWidth = screenWidth / (buttonCount + 2);
    }

    const gap = 25;
    const totalWidth = buttonCount * buttonWidth + (buttonCount - 1) * gap;
    const leftPosition = Math.max(56, (screenWidth - totalWidth) / 2);
    const topPosition = isDesktop ? '150px' : '140px';

    return {
      left: `${leftPosition}px`,
      top: topPosition,
      gap: `${gap}px`,
      buttonWidth: buttonWidth,
    };
  }, [isMounted, windowSize, getCurrentPageOptions, showNextButton, isDesktop]);

  // 클라이언트 마운트 전에는 null 반환
  if (!isMounted) {
    return null;
  }

  // 완료 화면 제거 - 바로 처음으로 돌아가도록 처리

  return (
    <>
      <IrisTracker />
      <AALayout
        title={currentStep === 'category' ? '상황 선택' : currentStep === 'subject' ? '주어 선택' : '서술어 선택'}
        blinkMode={blinkMode}
        onBlinkModeChange={setBlinkMode}
        outputText={currentSentence}
        isDesktop={isDesktop}
        onBack={resetSelection}
      >
        <div
          className="absolute flex"
          style={buttonContainerStyle}
        >
          {getCurrentPageOptions().map((option) => (
            <SelectionButton
              key={option.id}
              ref={(el) => {
                if (el) buttonRefs.current[option.id] = el;
              }}
              id={option.id}
              label={option.label}
              progress={hoverProgress[option.id] || 0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              onClick={() => {
                if (handleSelectionRef.current) {
                  handleSelectionRef.current(option.id);
                }
              }}
              onMouseEnter={() => handleButtonHoverStart(option.id)}
              onMouseLeave={() => handleButtonHoverEnd(option.id)}
            />
          ))}

          {showNextButton() && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.next_page = el;
              }}
              id="next_page"
              label="다시"
              progress={hoverProgress.next_page || 0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              onClick={() => {
                if (handleSelectionRef.current) {
                  handleSelectionRef.current('next_page');
                }
              }}
              onMouseEnter={() => handleButtonHoverStart('next_page')}
              onMouseLeave={() => handleButtonHoverEnd('next_page')}
            />
          )}
        </div>
      </AALayout>
    </>
  );
}