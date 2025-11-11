'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AALayout from '@/components/AALayout';
import SelectionButton from '@/components/SelectionButton';
import CompletionModal from '@/components/CompletionModal';
import { categories, subjects, coreWords, predicates, buildSentence, WordOption } from '@/data/wordData';
import { useRegisterIrisHandlers } from '@/contexts/IrisTrackerContext';
import { getEnhancedSentence } from '@/services/gptService';

export type SelectionStep = 'category' | 'subject' | 'coreWord' | 'predicate';

export default function MainPage() {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCoreWord, setSelectedCoreWord] = useState<string>('');
  const [selectedPredicate, setSelectedPredicate] = useState<string>('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [finalSentence, setFinalSentence] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [speechInitialized, setSpeechInitialized] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  // 모달 상태를 ref로도 저장 (클로저 문제 해결)
  const showCompletionModalRef = useRef<boolean>(false);

  // 현재 선택된 버튼 인덱스 (zone 기반 선택)
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);

  // showCompletionModal state와 ref를 동기화
  useEffect(() => {
    showCompletionModalRef.current = showCompletionModal;
    console.log('🔄 showCompletionModal 상태 변경:', showCompletionModal);
  }, [showCompletionModal]);

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

    // 웹앱/PWA 음성 초기화 (강화)
    const initSpeech = () => {
      if (!speechInitialized && typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          console.log('🔊 [웹앱] 음성 시스템 초기화 시작');

          // 음성 목록 강제 로드
          const loadVoicesForWebApp = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log('📋 [웹앱] 초기화 시점 음성 목록:', voices.length, '개');

            if (voices.length > 0) {
              // 빈 utterance로 음성 시스템 활성화
              const utterance = new SpeechSynthesisUtterance('');
              utterance.volume = 0;
              window.speechSynthesis.speak(utterance);
              setSpeechInitialized(true);
              console.log('✅ [웹앱] 음성 시스템 초기화 완료');
            }
          };

          // 즉시 실행
          loadVoicesForWebApp();

          // 음성 목록 변경 이벤트 (웹앱에서 지연 로드 대응)
          if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
              console.log('🔄 [웹앱] 음성 목록 변경 감지');
              loadVoicesForWebApp();
            };
          }

          // 타임아웃 후 재시도
          setTimeout(() => {
            if (!speechInitialized) {
              console.log('⏱️ [웹앱] 타임아웃 후 재초기화');
              loadVoicesForWebApp();
            }
          }, 1000);
        } catch (error) {
          console.warn('⚠️ [웹앱] 음성 시스템 초기화 실패:', error);
        }
      }
    };

    // 첫 클릭/터치 시 음성 초기화 (웹앱에서 필수)
    const handleFirstInteraction = () => {
      console.log('👆 [웹앱] 첫 사용자 제스처 감지');
      initSpeech();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // 웹앱 환경에서는 즉시 초기화 시도
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      console.log('📱 [웹앱] 독립 실행형 모드 감지');
      initSpeech(); // 웹앱에서는 즉시 시도
    }

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
      case 'coreWord':
        return coreWords[selectedCategory] || [];
      case 'predicate':
        return predicates[`${selectedCategory}_${selectedCoreWord}`] || [];
      default:
        return [];
    }
  }, [currentStep, selectedCategory, selectedCoreWord]);

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

  // 음성 출력 함수 (웹앱/PWA 최적화)
  const speakSentence = useCallback((text: string) => {
    // speechSynthesis 지원 여부 확인
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('⚠️ speechSynthesis를 지원하지 않는 브라우저입니다');
      return;
    }

    try {
      console.log('🔊 [웹앱] TTS 시작 요청:', text);

      // 이전 음성 중지 및 큐 초기화
      try {
        window.speechSynthesis.cancel();
        // 웹앱에서는 짧은 대기 후 실행이 더 안정적
        setTimeout(() => {
          executeSpeech();
        }, 50);
      } catch (cancelError) {
        console.warn('⚠️ 음성 중지 실패:', cancelError);
        executeSpeech();
      }

      function executeSpeech() {
        try {
          // 음성 목록 가져오기 (웹앱에서는 매번 확인 필요)
          const voices = window.speechSynthesis.getVoices();
          console.log('📋 [웹앱] 사용 가능한 음성:', voices.length, '개');

          // 웹앱 환경 확인
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true
            || document.referrer.includes('android-app://');
          console.log('📱 웹앱 모드:', isStandalone ? '예' : '아니오');

          const utterance = new SpeechSynthesisUtterance(text);

          // 한국어 음성 찾기 (우선순위: Google > Samsung > 기타)
          let koreanVoice = voices.find(voice =>
            (voice.lang === 'ko-KR' || voice.lang.startsWith('ko')) &&
            voice.name.includes('Google')
          );

          if (!koreanVoice) {
            koreanVoice = voices.find(voice =>
              (voice.lang === 'ko-KR' || voice.lang.startsWith('ko')) &&
              voice.name.includes('Samsung')
            );
          }

          if (!koreanVoice) {
            koreanVoice = voices.find(voice =>
              voice.lang === 'ko-KR' || voice.lang.startsWith('ko')
            );
          }

          if (koreanVoice) {
            utterance.voice = koreanVoice;
            console.log('🔊 [웹앱] 선택된 음성:', koreanVoice.name, '/', koreanVoice.lang);
          } else {
            console.log('⚠️ [웹앱] 한국어 음성 없음, 기본 음성 사용');
            if (voices.length > 0) {
              utterance.voice = voices[0];
              console.log('🔊 [웹앱] 대체 음성:', voices[0].name);
            }
          }

          // 웹앱 최적화 설정
          utterance.lang = 'ko-KR';
          utterance.rate = 1.0; // 웹앱에서는 1.0이 가장 안정적
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          // 이벤트 핸들러
          utterance.onstart = () => {
            console.log('✅ [웹앱] 음성 출력 시작');
          };

          utterance.onend = () => {
            console.log('✅ [웹앱] 음성 출력 완료');
          };

          utterance.onerror = (event) => {
            console.error('❌ [웹앱] 음성 출력 에러:', event.error);

            // 웹앱 특정 에러 처리
            if (event.error === 'not-allowed') {
              console.error('❌ [웹앱] 음성 권한 거부 - 사용자 제스처 필요');
            } else if (event.error === 'network') {
              console.error('❌ [웹앱] 네트워크 오류 - 오프라인 음성 사용 권장');
            } else if (event.error === 'synthesis-failed') {
              console.error('❌ [웹앱] 음성 합성 실패 - 재시도 필요');
              // 재시도
              setTimeout(() => {
                try {
                  window.speechSynthesis.speak(utterance);
                } catch {
                  console.error('❌ [웹앱] 재시도 실패');
                }
              }, 200);
            }
          };

          // 음성 출력 실행
          console.log('🎤 [웹앱] speak() 호출');
          window.speechSynthesis.speak(utterance);

          // 웹앱에서 일시정지 문제 방지
          const resumeInterval = setInterval(() => {
            if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
              console.log('⚠️ [웹앱] TTS 일시정지 감지, resume 호출');
              window.speechSynthesis.resume();
            }
            if (!window.speechSynthesis.speaking) {
              clearInterval(resumeInterval);
            }
          }, 100);

          // 10초 후 interval 정리
          setTimeout(() => clearInterval(resumeInterval), 10000);

        } catch (execError) {
          console.error('❌ [웹앱] executeSpeech 에러:', execError);
        }
      }
    } catch (error) {
      console.error('❌ [웹앱] speechSynthesis 에러:', error);
    }
  }, []);

  // 단계별 뒤로가기
  const handleBack = useCallback(() => {
    // 음성 중지 (안전하게)
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn('⚠️ 음성 중지 실패:', error);
    }

    // 현재 단계에 따라 이전 단계로 이동
    if (currentStep === 'predicate') {
      // 서술어 선택 중 → 핵심 단어 선택으로
      setCurrentStep('coreWord');
      setSelectedPredicate('');
      setFinalSentence('');
      setIsGenerating(false);
    } else if (currentStep === 'coreWord') {
      // 핵심 단어 선택 중 → 주어 선택으로
      setCurrentStep('subject');
      setSelectedCoreWord('');
    } else if (currentStep === 'subject') {
      // 주어 선택 중 → 카테고리 선택으로
      setCurrentStep('category');
      setSelectedSubject('');
    } else {
      // 카테고리 선택 중 → 모든 것 초기화 (처음으로)
      setCurrentStep('category');
      setSelectedCategory('');
      setSelectedSubject('');
      setSelectedCoreWord('');
      setSelectedPredicate('');
      setFinalSentence('');
      setIsGenerating(false);
    }

    setCurrentPage(0);
    setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
  }, [currentStep]);

  // 전체 초기화 (필요한 경우를 위해 유지)
  const resetSelection = useCallback(() => {
    console.log('🔄 resetSelection 호출됨');

    // 음성 중지 (안전하게)
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn('⚠️ 음성 중지 실패:', error);
    }

    // 모달 상태 완전히 초기화
    setShowCompletionModal(false);
    showCompletionModalRef.current = false;

    setCurrentStep('category');
    setSelectedCategory('');
    setSelectedSubject('');
    setSelectedCoreWord('');
    setSelectedPredicate('');
    setCurrentPage(0);
    setFinalSentence('');
    setIsGenerating(false);
    setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋

    console.log('✅ resetSelection 완료 - 모든 상태 초기화됨');
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
        setSelectedSubject(buttonId);
        setCurrentStep('coreWord');
        setCurrentPage(0);
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'coreWord':
        setSelectedCoreWord(buttonId);
        setCurrentStep('predicate');
        setCurrentPage(0);
        setSelectedButtonIndex(0); // 첫 번째 버튼으로 리셋
        break;

      case 'predicate':
        // 문장 생성
        const originalSentence = buildSentence(selectedCategory, selectedSubject, selectedCoreWord, buttonId);
        const isQuestion = selectedSubject === 'question';

        // 즉시 원본 문장 표시 및 생성 중 상태 설정
        setFinalSentence(originalSentence);
        setIsGenerating(true);
        setSelectedPredicate(buttonId);

        // GPT로 문장 개선 (질문 여부와 말투 정보 포함)
        getEnhancedSentence(originalSentence, isQuestion, 'casual').then((enhancedSentence) => {
          setFinalSentence(enhancedSentence);
          setIsGenerating(false);

          // 개선된 문장으로 음성 출력
          speakSentence(enhancedSentence);

          // 모달 표시
          setShowCompletionModal(true);
          showCompletionModalRef.current = true;
        }).catch((error) => {
          console.error('문장 생성 오류:', error);
          setIsGenerating(false);

          // 오류 시 원본 문장으로 진행
          speakSentence(originalSentence);
          setShowCompletionModal(true);
          showCompletionModalRef.current = true;
        });
        break;
    }
  }, [currentStep, currentPage, getAllOptions, selectedCategory, selectedSubject, selectedCoreWord, speakSentence]);

  // Zone 기반 버튼 이동 핸들러 (기존 방식)
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

      // 다시 버튼 표시 여부에 따라 버튼 배열 구성
      const allButtons = showNextButton()
        ? [...currentOptions, { id: 'next_page', label: '다시' }]
        : currentOptions;

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
  }, [getCurrentPageOptions, showNextButton]);

  // 실시간 문장 생성
  const currentSentence = useMemo(() => {
    if (isGenerating) {
      return "문장을 생성하는 중입니다...";
    }
    if (finalSentence) {
      return finalSentence;
    }
    const sentence = buildSentence(selectedCategory, selectedSubject, selectedCoreWord, selectedPredicate);
    return sentence;
  }, [selectedCategory, selectedSubject, selectedCoreWord, selectedPredicate, finalSentence, isGenerating]);

  // 버튼 레이아웃 스타일
  const buttonContainerStyle = useMemo(() => {
    if (windowSize.width === 0) {
      return {
        left: '56px',
        top: '150px',
        gap: '14px',
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

    const gap = 14;
    const totalWidth = buttonCount * buttonWidth + (buttonCount - 1) * gap;
    const leftPosition = Math.max(56, (screenWidth - totalWidth) / 2);
    // 상단 버튼(40px + 80px) 아래 10px 간격으로 배치
    const topPosition = '145px';

    return {
      left: `${leftPosition}px`,
      top: topPosition,
      gap: `${gap}px`,
      buttonWidth: buttonWidth,
      leftNumber: leftPosition,
      totalWidthNumber: totalWidth,
    };
  }, [windowSize, getCurrentPageOptions, showNextButton]);

  // 긴 깜빡임 핸들러 (현재 선택된 버튼 클릭 또는 모달에서 처음으로 돌아가기)
  const handleLongBlink = useCallback(() => {
    console.log('👁️ handleLongBlink 호출됨, showCompletionModal state:', showCompletionModal, ', ref:', showCompletionModalRef.current);

    // 모달이 표시 중일 때: 처음 화면으로 돌아가기
    if (showCompletionModal) {
      console.log('🔄 [모달] 긴 깜빡임으로 처음 화면으로 돌아갑니다');
      setShowCompletionModal(false);
      showCompletionModalRef.current = false;
      resetSelection();
      return;
    }

    // 일반 상태: 현재 선택된 버튼 클릭
    const currentOptions = getCurrentPageOptions();

    // 다시 버튼 표시 여부에 따라 버튼 배열 구성
    const allButtons = showNextButton()
      ? [...currentOptions, { id: 'next_page', label: '다시' }]
      : currentOptions;

    if (allButtons.length === 0) {
      console.log('⚠️ 선택 가능한 버튼이 없습니다');
      return;
    }

    const selectedButton = allButtons[selectedButtonIndex];
    if (selectedButton) {
      console.log(`✅ 긴 깜빡임으로 버튼 선택: ${selectedButton.label} (ID: ${selectedButton.id})`);
      handleSelection(selectedButton.id);
    }
  }, [showCompletionModal, getCurrentPageOptions, showNextButton, selectedButtonIndex, handleSelection, resetSelection]);

  // 짧은 깜빡임 여러 번 핸들러 (뒤로가기)
  const handleDoubleBlink = useCallback(() => {
    console.log('🔙 짧은 깜빡임 여러 번으로 뒤로가기 실행');
    handleBack();
  }, [handleBack]);

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
      {/* 문장 완성 모달 */}
      <CompletionModal
        isVisible={showCompletionModal}
        sentence={finalSentence || currentSentence}
      />

      <AALayout
        title={
          currentStep === 'category' ? '상황 선택' :
          currentStep === 'subject' ? '주어 선택' :
          currentStep === 'coreWord' ? '핵심 단어 선택' :
          currentPage > 0 ? '단어 선택' : '서술어 선택'
        }
        outputText={currentSentence}
        isDesktop={isDesktop}
        onBack={handleBack}
        buttonContainerLeft={buttonContainerStyle.leftNumber}
        buttonContainerWidth={buttonContainerStyle.totalWidthNumber}
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

          {showNextButton() && (
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