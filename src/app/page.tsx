'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import IrisTracker from '@/components/IrisTracker';
import AALayout from '@/components/AALayout';
import SelectionButton from '@/components/SelectionButton';
import { categories, subjects, predicates, buildSentence, WordOption } from '@/data/wordData';
import { getEnhancedSentence } from '@/lib/openai';

type SelectionStep = 'category' | 'subject' | 'predicate';

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
  const [finalSentence, setFinalSentence] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isQuestionMode, setIsQuestionMode] = useState<boolean>(false);

  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const handleSelectionRef = useRef<((buttonId: string) => void) | null>(null);

  // 클라이언트 마운트 및 화면 크기 감지 통합
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
      setIsDesktop(width >= 1900 && height >= 1000);
    };

    setIsMounted(true);
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
    setFinalSentence('');
    setIsGenerating(false);
    setIsQuestionMode(false);
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
          // 질문 버튼 처리
          if (buttonId === 'question_mode') {
            setIsQuestionMode(true);
            // 주어를 선택하지 않고 바로 서술어 단계로
            setCurrentStep('predicate');
            setHoverProgress({});
            setCurrentPage(0);
          } else {
            setSelectedSubject(buttonId);
            setCurrentStep('predicate');
            setHoverProgress({});
            setCurrentPage(0);
          }
          break;
        case 'predicate':
          setSelectedPredicate(buttonId);
          setHoverProgress({});

          // GPT API를 통해 문장 개선
          const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label || '';
          const predicateLabel = predicates[selectedCategory]?.find(p => p.id === buttonId)?.label || '';
          let originalSentence = buildSentence(selectedSubject, buttonId, selectedCategory);

          // 질문 모드일 경우 물음표 추가
          if (isQuestionMode) {
            originalSentence = originalSentence + '?';
          }

          // 즉시 원본 문장을 표시하고 생성 중 상태로 변경
          setFinalSentence(originalSentence);
          setIsGenerating(true);

          // GPT API 호출 (비동기로 처리)
          getEnhancedSentence(subjectLabel, predicateLabel, selectedCategory, originalSentence, isQuestionMode)
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
  }, [currentStep, currentPage, getAllOptions, resetSelection, selectedCategory, selectedSubject, isQuestionMode]);

  // 버튼 호버 시작
  const handleButtonHoverStart = useCallback((buttonId: string) => {
    if (hoverTimerRef.current[buttonId]) {
      clearInterval(hoverTimerRef.current[buttonId]!);
    }

    hoverTimerRef.current[buttonId] = setInterval(() => {
      setHoverProgress((prev) => {
        const currentProgress = prev[buttonId] || 0;
        const newProgress = Math.min(currentProgress + 1.6, 100);

        if (newProgress >= 100 && currentProgress < 100) {
          if (handleSelectionRef.current) {
            handleSelectionRef.current(buttonId);
          }
        }

        return { ...prev, [buttonId]: newProgress };
      });
    }, 16);
  }, []);

  // 버튼 호버 종료
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
      let allButtons;

      // 주어 선택 단계에서는 질문 버튼도 추가
      if (currentStep === 'subject') {
        allButtons = [...currentOptions, { id: 'question_mode', label: '질문' }];
      } else {
        allButtons = showNextButton()
          ? [...currentOptions, { id: 'next_page', label: '다시' }]
          : currentOptions;
      }

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

  // 실시간 문장 생성
  const currentSentence = useMemo(() => {
    if (isGenerating) {
      return "GPT가 문장을 생성하는 중입니다...";
    }
    if (finalSentence) {
      return finalSentence;
    }
    let sentence = buildSentence(selectedSubject, selectedPredicate, selectedCategory);
    if (isQuestionMode && sentence) {
      sentence = sentence + '?';
    }
    return sentence;
  }, [selectedSubject, selectedPredicate, selectedCategory, finalSentence, isGenerating, isQuestionMode]);

  // 버튼 레이아웃 스타일
  const buttonContainerStyle = useMemo(() => {
    if (windowSize.width === 0) {
      return {
        left: '56px',
        top: '150px',
        gap: '25px',
        buttonWidth: 300,
      };
    }

    const currentOptions = getCurrentPageOptions();
    const hasNext = showNextButton();
    let buttonCount;

    if (currentStep === 'subject') {
      buttonCount = currentOptions.length + 1;
    } else {
      buttonCount = hasNext ? currentOptions.length + 1 : currentOptions.length;
    }
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
  }, [windowSize, getCurrentPageOptions, showNextButton, isDesktop, currentStep]);

  // 긴 깜빡임 핸들러 (뒤로가기)
  const handleLongBlink = useCallback(() => {
    console.log('🔙 긴 깜빡임으로 뒤로가기 실행');
    resetSelection();
  }, [resetSelection]);

  // 짧은 깜빡임 여러 번 핸들러 (이모티콘 - 나중에 구현)
  const handleDoubleBlink = useCallback(() => {
    console.log('😊 짧은 깜빡임 여러 번 감지 - 이모티콘 기능 (추후 구현 예정)');
    // TODO: 이모티콘 기능 구현 시 여기에 코드 추가
    // 예: setShowEmoticonPanel(true);
  }, []);

  // 🔥 Hook 순서 위반 방지: 모든 Hook 호출 후에 조건부 렌더링
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <IrisTracker
        onLongBlink={handleLongBlink}
        onDoubleBlink={handleDoubleBlink}
      />
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

          {currentStep === 'subject' && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.question_mode = el;
              }}
              id="question_mode"
              label="질문"
              progress={hoverProgress.question_mode || 0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isNextButton={true}
              onClick={() => {
                if (handleSelectionRef.current) {
                  handleSelectionRef.current('question_mode');
                }
              }}
              onMouseEnter={() => handleButtonHoverStart('question_mode')}
              onMouseLeave={() => handleButtonHoverEnd('question_mode')}
            />
          )}

          {currentStep !== 'subject' && showNextButton() && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.next_page = el;
              }}
              id="next_page"
              label="다시"
              progress={hoverProgress.next_page || 0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isNextButton={true}
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