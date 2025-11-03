'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import IrisTracker from '@/components/IrisTracker';
import AALayout from '@/components/AALayout';
import SelectionButton from '@/components/SelectionButton';
import { categories, subjects, predicates, buildSentence, WordOption } from '@/data/wordData';
import { getEnhancedSentence } from '@/lib/openai';

type SelectionStep = 'category' | 'subject' | 'predicate';

interface SelectionState {
  currentStep: SelectionStep;
  selectedCategory: string;
  selectedSubject: string;
  selectedPredicate: string;
  isQuestionMode: boolean;
}

interface UIState {
  blinkMode: 'single' | 'double';
  currentPage: number;
  finalSentence: string;
  isGenerating: boolean;
}

export default function MainPage() {
  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    currentStep: 'category',
    selectedCategory: '',
    selectedSubject: '',
    selectedPredicate: '',
    isQuestionMode: false,
  });

  // UI state
  const [ui, setUI] = useState<UIState>({
    blinkMode: 'single',
    currentPage: 0,
    finalSentence: '',
    isGenerating: false,
  });

  // Environment state
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // 현재 선택된 버튼 인덱스
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);

  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Saccade 처리 중 플래그
  const isProcessingSaccadeRef = useRef(false);

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
    switch (selection.currentStep) {
      case 'category':
        return categories.slice(0, 4);
      case 'subject':
        return subjects;
      case 'predicate':
        return predicates[selection.selectedCategory] || [];
      default:
        return [];
    }
  }, [selection.currentStep, selection.selectedCategory]);

  // 현재 페이지에 표시할 옵션 가져오기 (최대 4개)
  const getCurrentPageOptions = useCallback((): WordOption[] => {
    const allOptions = getAllOptions();

    if (selection.currentStep === 'category') {
      return allOptions;
    }

    const startIdx = ui.currentPage * 4;
    return allOptions.slice(startIdx, startIdx + 4);
  }, [getAllOptions, ui.currentPage, selection.currentStep]);

  // "다시" 버튼을 표시할지 확인
  const showNextButton = useCallback((): boolean => {
    if (selection.currentStep === 'category') return false;
    const allOptions = getAllOptions();
    return allOptions.length > 4;
  }, [getAllOptions, selection.currentStep]);

  // 선택 초기화
  const resetSelection = useCallback(() => {
    setSelection({
      currentStep: 'category',
      selectedCategory: '',
      selectedSubject: '',
      selectedPredicate: '',
      isQuestionMode: false,
    });
    setUI(prev => ({
      ...prev,
      currentPage: 0,
      finalSentence: '',
      isGenerating: false,
    }));
    setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
  }, []);

  // 선택 처리 함수
  const handleSelection = useCallback((buttonId: string) => {
    if (buttonId === 'next_page') {
      const allOptions = getAllOptions();
      const nextPageStart = (ui.currentPage + 1) * 4;

      setUI(prev => ({
        ...prev,
        currentPage: nextPageStart >= allOptions.length ? 0 : prev.currentPage + 1
      }));
      return;
    }

    switch (selection.currentStep) {
      case 'category':
        setSelection(prev => ({
          ...prev,
          selectedCategory: buttonId,
          currentStep: 'subject',
        }));
        setUI(prev => ({ ...prev, currentPage: 0 }));
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'subject':
        if (buttonId === 'question_mode') {
          setSelection(prev => ({
            ...prev,
            isQuestionMode: true,
            currentStep: 'predicate',
          }));
        } else {
          setSelection(prev => ({
            ...prev,
            selectedSubject: buttonId,
            currentStep: 'predicate',
          }));
        }
        setUI(prev => ({ ...prev, currentPage: 0 }));
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'predicate':
        // GPT API를 통해 문장 개선
        const subjectLabel = subjects.find(s => s.id === selection.selectedSubject)?.label || '';
        const predicateLabel = predicates[selection.selectedCategory]?.find(p => p.id === buttonId)?.label || '';
        let originalSentence = buildSentence(selection.selectedSubject, buttonId, selection.selectedCategory);

        if (selection.isQuestionMode) {
          originalSentence = originalSentence + '?';
        }

        // 즉시 원본 문장 표시
        setUI(prev => ({
          ...prev,
          finalSentence: originalSentence,
          isGenerating: true,
        }));
        setSelection(prev => ({ ...prev, selectedPredicate: buttonId }));

        // GPT API 호출
        getEnhancedSentence(subjectLabel, predicateLabel, selection.selectedCategory, originalSentence, selection.isQuestionMode)
          .then((enhanced) => {
            setUI(prev => ({
              ...prev,
              finalSentence: enhanced,
              isGenerating: false,
            }));
            setTimeout(resetSelection, 3000);
          })
          .catch((error) => {
            console.error('GPT 문장 생성 실패:', error);
            setUI(prev => ({ ...prev, isGenerating: false }));
            setTimeout(resetSelection, 3000);
          });
        break;
    }
  }, [selection, ui.currentPage, getAllOptions, resetSelection]);

  // Zone 기반 버튼 이동 핸들러
  const handleZoneChange = useCallback((direction: 'left' | 'right') => {
    // 이미 처리 중이면 무시
    if (isProcessingSaccadeRef.current) {
      console.log(`[MainPage] Ignoring duplicate saccade (already processing)`);
      return;
    }

    isProcessingSaccadeRef.current = true;
    console.log(`[MainPage] Saccade detected: ${direction}, Time: ${new Date().toISOString()}`);

    setSelectedButtonIndex((prev) => {
      const currentOptions = getCurrentPageOptions();
      let allButtons: WordOption[];

      // 주어 선택 단계에서는 질문 버튼도 추가
      if (selection.currentStep === 'subject') {
        allButtons = [...currentOptions, { id: 'question_mode', label: '질문' }];
      } else {
        allButtons = showNextButton()
          ? [...currentOptions, { id: 'next_page', label: '다시' }]
          : currentOptions;
      }

      if (allButtons.length === 0) {
        isProcessingSaccadeRef.current = false;
        return prev;
      }

      let nextIndex;
      if (direction === 'right') {
        nextIndex = (prev + 1) % allButtons.length;
        console.log(`[MainPage] Moving right: ${prev} → ${nextIndex} (of ${allButtons.length} buttons)`);
      } else {
        nextIndex = prev === 0 ? allButtons.length - 1 : prev - 1;
        console.log(`[MainPage] Moving left: ${prev} → ${nextIndex} (of ${allButtons.length} buttons)`);
      }

      // 300ms 후에 플래그 리셋
      setTimeout(() => {
        isProcessingSaccadeRef.current = false;
      }, 300);

      return nextIndex;
    });
  }, [getCurrentPageOptions, selection.currentStep, showNextButton]);


  // 실시간 문장 생성 (완성된 문장이 있으면 그것을 표시)
  const currentSentence = useMemo(() => {
    // GPT가 생성 중일 때
    if (ui.isGenerating) {
      return "GPT가 문장을 생성하는 중입니다...";
    }
    // finalSentence가 있으면 완성된 문장 표시
    if (ui.finalSentence) {
      return ui.finalSentence;
    }
    // 아니면 현재까지 선택된 단어들로 문장 생성
    let sentence = buildSentence(
      selection.selectedSubject,
      selection.selectedPredicate,
      selection.selectedCategory
    );
    // 질문 모드이고 문장이 있으면 물음표 추가
    if (selection.isQuestionMode && sentence) {
      sentence = sentence + '?';
    }
    return sentence;
  }, [selection, ui.finalSentence, ui.isGenerating]);

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
    let buttonCount;

    // 주어 선택 단계에서는 질문 버튼도 포함
    if (selection.currentStep === 'subject') {
      buttonCount = currentOptions.length + 1; // 질문 버튼 추가
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
  }, [isMounted, windowSize, getCurrentPageOptions, showNextButton, isDesktop, selection.currentStep]);

  // 클라이언트 마운트 전에는 null 반환
  if (!isMounted) {
    return null;
  }

  // 완료 화면 제거 - 바로 처음으로 돌아가도록 처리

  return (
    <>
      <IrisTracker onZoneChange={handleZoneChange} />
      <AALayout
        title={selection.currentStep === 'category' ? '상황 선택' : selection.currentStep === 'subject' ? '주어 선택' : '서술어 선택'}
        blinkMode={ui.blinkMode}
        onBlinkModeChange={(mode) => setUI(prev => ({ ...prev, blinkMode: mode }))}
        outputText={currentSentence}
        isDesktop={isDesktop}
        onBack={resetSelection}
      >
        <div
          className="absolute flex"
          style={buttonContainerStyle}
        >
          {getCurrentPageOptions().map((option, index) => (
            <SelectionButton
              key={option.id}
              ref={(el) => {
                if (el) buttonRefs.current[option.id] = el;
              }}
              id={option.id}
              label={option.label}
              progress={0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isSelected={index === selectedButtonIndex}
              onClick={() => handleSelection(option.id)}
            />
          ))}

          {/* 주어 선택 단계에서 질문 버튼 표시 */}
          {selection.currentStep === 'subject' && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.question_mode = el;
              }}
              id="question_mode"
              label="질문"
              progress={0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isNextButton={true}
              isSelected={selectedButtonIndex === getCurrentPageOptions().length}
              onClick={() => handleSelection('question_mode')}
            />
          )}

          {/* 다시 버튼 표시 (주어 선택 단계가 아닐 때만) */}
          {selection.currentStep !== 'subject' && showNextButton() && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.next_page = el;
              }}
              id="next_page"
              label="다시"
              progress={0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isNextButton={true}
              isSelected={selectedButtonIndex === getCurrentPageOptions().length}
              onClick={() => handleSelection('next_page')}
            />
          )}
        </div>
      </AALayout>
    </>
  );
}