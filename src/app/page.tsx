'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AALayout from '@/components/AALayout';
import SelectionButton from '@/components/SelectionButton';
import { categories, subjects, predicates, buildSentence, WordOption } from '@/data/wordData';
import { getEnhancedSentence } from '@/lib/openai';
import { useRegisterIrisHandlers } from '@/contexts/IrisTrackerContext';

type SelectionStep = 'category' | 'subject' | 'predicate';

export default function MainPage() {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPredicate, setSelectedPredicate] = useState<string>('');
  const [blinkMode, setBlinkMode] = useState<'single' | 'double'>('single');
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [finalSentence, setFinalSentence] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isQuestionMode, setIsQuestionMode] = useState<boolean>(false);
  const [speechInitialized, setSpeechInitialized] = useState(false);

  // 현재 선택된 버튼 인덱스 (zone 기반 선택)
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

    // 음성 초기화 (모바일에서 필요)
    const initSpeech = () => {
      if (!speechInitialized && typeof window !== 'undefined' && window.speechSynthesis) {
        // 빈 utterance로 음성 시스템 초기화 (모바일 브라우저용)
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        setSpeechInitialized(true);
        console.log('🔊 음성 시스템 초기화 완료');
      }
    };

    // 첫 클릭/터치 시 음성 초기화
    const handleFirstInteraction = () => {
      initSpeech();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [speechInitialized]);

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

  // 음성 출력 함수 (모바일 호환)
  const speakSentence = useCallback((text: string) => {
    try {
      // 이전 음성 중지
      window.speechSynthesis.cancel();

      // 음성 목록 로드 대기 (모바일에서 필요)
      const loadVoices = () => {
        return new Promise<void>((resolve) => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve();
          } else {
            window.speechSynthesis.onvoiceschanged = () => {
              resolve();
            };
            // 타임아웃 추가 (최대 1초 대기)
            setTimeout(() => resolve(), 1000);
          }
        });
      };

      loadVoices().then(() => {
        // 새로운 음성 생성
        const utterance = new SpeechSynthesisUtterance(text);

        // 한국어 음성 찾기
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice =>
          voice.lang === 'ko-KR' || voice.lang.startsWith('ko')
        );

        if (koreanVoice) {
          utterance.voice = koreanVoice;
          console.log('🔊 사용 음성:', koreanVoice.name);
        } else {
          console.log('⚠️ 한국어 음성 없음, 기본 음성 사용');
        }

        utterance.lang = 'ko-KR'; // 한국어 설정
        utterance.rate = 0.9; // 속도 약간 느리게 (모바일에서 더 명확)
        utterance.pitch = 1.0; // 음높이 (0 ~ 2)
        utterance.volume = 1.0; // 볼륨 (0 ~ 1)

        // 이벤트 리스너 추가 (디버깅용)
        utterance.onstart = () => {
          console.log('🔊 음성 출력 시작:', text);
        };
        utterance.onend = () => {
          console.log('✅ 음성 출력 완료');
        };
        utterance.onerror = (event) => {
          console.error('❌ 음성 출력 에러:', event);
        };

        // 음성 출력
        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error('❌ speechSynthesis 에러:', error);
    }
  }, []);

  // 선택 초기화
  const resetSelection = useCallback(() => {
    // 음성 중지
    window.speechSynthesis.cancel();

    setCurrentStep('category');
    setSelectedCategory('');
    setSelectedSubject('');
    setSelectedPredicate('');
    setCurrentPage(0);
    setFinalSentence('');
    setIsGenerating(false);
    setIsQuestionMode(false);
    setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
  }, []);

  // 선택 처리 함수
  const handleSelection = useCallback((buttonId: string) => {
    if (buttonId === 'next_page') {
      const allOptions = getAllOptions();
      const nextPageStart = (currentPage + 1) * 4;
      setCurrentPage(nextPageStart >= allOptions.length ? 0 : currentPage + 1);
      return;
    }

    switch (currentStep) {
      case 'category':
        setSelectedCategory(buttonId);
        setCurrentStep('subject');
        setCurrentPage(0);
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'subject':
        if (buttonId === 'question_mode') {
          setIsQuestionMode(true);
          setCurrentStep('predicate');
        } else {
          setSelectedSubject(buttonId);
          setCurrentStep('predicate');
        }
        setCurrentPage(0);
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'predicate':
        // GPT API를 통해 문장 개선
        const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label || '';
        const predicateLabel = predicates[selectedCategory]?.find(p => p.id === buttonId)?.label || '';
        let originalSentence = buildSentence(selectedSubject, buttonId, selectedCategory);

        if (isQuestionMode) {
          originalSentence = originalSentence + '?';
        }

        // 즉시 원본 문장 표시
        setFinalSentence(originalSentence);
        setIsGenerating(true);
        setSelectedPredicate(buttonId);

        // GPT API 호출
        getEnhancedSentence(subjectLabel, predicateLabel, selectedCategory, originalSentence, isQuestionMode)
          .then((enhanced) => {
            setFinalSentence(enhanced);
            setIsGenerating(false);

            // 음성 출력
            speakSentence(enhanced);

            setTimeout(resetSelection, 3000);
          })
          .catch((error) => {
            console.error('GPT 문장 생성 실패:', error);
            setIsGenerating(false);

            // 에러 시에도 원본 문장 음성 출력
            speakSentence(originalSentence);

            setTimeout(resetSelection, 3000);
          });
        break;
    }
  }, [currentStep, currentPage, getAllOptions, resetSelection, selectedCategory, selectedSubject, isQuestionMode]);

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
      if (currentStep === 'subject') {
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
  }, [getCurrentPageOptions, currentStep, showNextButton]);

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

  // 긴 깜빡임 핸들러 (현재 선택된 버튼 클릭)
  const handleLongBlink = useCallback(() => {
    const currentOptions = getCurrentPageOptions();
    let allButtons: WordOption[];

    // 주어 선택 단계에서는 질문 버튼도 추가
    if (currentStep === 'subject') {
      allButtons = [...currentOptions, { id: 'question_mode', label: '질문' }];
    } else {
      allButtons = showNextButton()
        ? [...currentOptions, { id: 'next_page', label: '다시' }]
        : currentOptions;
    }

    if (allButtons.length === 0) {
      console.log('⚠️ 선택 가능한 버튼이 없습니다');
      return;
    }

    const selectedButton = allButtons[selectedButtonIndex];
    if (selectedButton) {
      console.log(`✅ 긴 깜빡임으로 버튼 선택: ${selectedButton.label} (ID: ${selectedButton.id})`);
      handleSelection(selectedButton.id);
    }
  }, [getCurrentPageOptions, currentStep, showNextButton, selectedButtonIndex, handleSelection]);

  // 짧은 깜빡임 여러 번 핸들러 (뒤로가기)
  const handleDoubleBlink = useCallback(() => {
    console.log('🔙 짧은 깜빡임 여러 번으로 뒤로가기 실행');
    resetSelection();
  }, [resetSelection]);

  // IrisTracker 핸들러를 Context에 등록
  const irisHandlers = useMemo(() => ({
    onLongBlink: handleLongBlink,
    onDoubleBlink: handleDoubleBlink,
    onZoneChange: handleZoneChange,
  }), [handleLongBlink, handleDoubleBlink, handleZoneChange]);

  useRegisterIrisHandlers(irisHandlers);

  // 🔥 Hook 순서 위반 방지: 모든 Hook 호출 후에 조건부 렌더링
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AALayout
        title={currentStep === 'category' ? '상황 선택' : currentStep === 'subject' ? '주어 선택' : '서술어 선택'}
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

          {currentStep === 'subject' && (
            <SelectionButton
              ref={(el) => {
                if (el) buttonRefs.current.question_mode = el;
              }}
              id="question_mode"
              label="질문"
              progress={0}
              isDesktop={isDesktop}
              customWidth={buttonContainerStyle.buttonWidth}
              isNextButton={false}
              isSelected={selectedButtonIndex === getCurrentPageOptions().length}
              onClick={() => handleSelection('question_mode')}
            />
          )}

          {currentStep !== 'subject' && showNextButton() && (
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