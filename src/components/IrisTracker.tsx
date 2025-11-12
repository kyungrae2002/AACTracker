'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface GazeRatio {
  x: number;
  y: number;
}

interface EyeBounds {
  outer?: { x: number; y: number };
  inner?: { x: number; y: number };
  top?: { x: number; y: number };
  bottom?: { x: number; y: number };
}

interface Landmark {
  x: number;
  y: number;
  z?: number;
}

interface FaceMeshResults {
  multiFaceLandmarks?: Landmark[][];
}

// FaceMesh 인스턴스 타입 정의
interface FaceMeshInstance {
  setOptions: (options: {
    maxNumFaces: number;
    refineLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: FaceMeshResults) => void) => void;
  send: (data: { image: HTMLVideoElement }) => Promise<void>;
}

declare global {
  interface Window {
    FaceMesh: new (config: {
      locateFile: (file: string) => string;
    }) => FaceMeshInstance;
  }
}

interface IrisTrackerProps {
  onLongBlink?: () => void;
  onDoubleBlink?: () => void;
  onZoneChange?: (direction: 'left' | 'right') => void;
}

const IrisTracker: React.FC<IrisTrackerProps> = ({ onLongBlink, onDoubleBlink, onZoneChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gazeCursorRef = useRef<HTMLDivElement>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraPermissionRequested, setCameraPermissionRequested] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedPositionRef = useRef<Position>({ x: 0, y: 0 });
  const lastGazeRatioRef = useRef<GazeRatio>({ x: 0.5, y: 0.5 });
  const frameSkipCountRef = useRef(0);
  const lastValidPositionRef = useRef<Position | null>(null);

  // 에러 카운터 및 자동 재시작 관련
  const errorCountRef = useRef(0);
  const MAX_ERRORS_BEFORE_RELOAD = 1; // 에러 발생 시 즉시 재시작

  // 눈 깜빡임 감지 관련 상태
  const isBlinkingRef = useRef(false);
  const blinkStartTimeRef = useRef<number | null>(null);
  const lastBlinkTimesRef = useRef<number[]>([]);

  // 적응형 EAR 임계값을 위한 상태
  const baselineEARHistoryRef = useRef<number[]>([]); // 눈을 뜬 상태의 EAR 히스토리
  const adaptiveThresholdRef = useRef<number>(0.21); // 동적으로 계산된 임계값 (초기값)

  // Zone 기반 이동을 위한 refs (기존 방식 복원)
  const currentZoneRef = useRef<'left' | 'center' | 'right'>('center');
  const lastZoneChangeRef = useRef<number>(0);
  const ZONE_CHANGE_COOLDOWN = 1000; // 1초 쿨다운

  const SMOOTHING_FACTOR = 0.22; // 0.15 → 0.22 (반응성 개선, 여전히 부드러움 유지)
  const SENSITIVITY_X = 3.0;
  const SENSITIVITY_Y = 4.0;
  const FRAME_SKIP = 2; // 2프레임마다 1번만 처리 (성능 최적화)
  const MAX_POSITION_CHANGE = 70; // 50 → 70 (더 빠른 이동 허용)

  // 영역별 중력 관련 상수
  const GRAVITY_STRENGTH = 2.6; // 중력 강도 (0~1, 높을수록 강함) - 2배로 증가

  // 눈 깜빡임 감지 상수
  const LONG_BLINK_DURATION = 800; // 긴 깜빡임으로 판단하는 최소 지속 시간 (ms)
  const MAX_BLINK_DURATION = 2000; // 최대 깜빡임 지속 시간 (ms) - 이보다 길면 무시
  const DOUBLE_BLINK_WINDOW = 800; // 짧은 깜빡임이 여러 번 발생했는지 확인하는 시간 창 (ms) - 900→600으로 감소
  const DOUBLE_BLINK_COUNT = 2; // "깜빡깜빡"으로 인식하는 최소 깜빡임 횟수

  // 적응형 EAR 임계값 설정
  // 사용자의 눈 크기에 자동으로 적응하여 최적의 깜빡임 감지 임계값을 계산
  const BASELINE_HISTORY_SIZE = 90; // 3초간의 EAR 데이터 (30fps 기준)
  const BASELINE_MIN_SAMPLES = 30; // 최소 1초의 데이터가 쌓여야 적응형 임계값 사용
  const BASELINE_UPDATE_RATIO = 0.85; // 기준값의 85%를 임계값으로 사용

  // 자동 재시작 함수 (에러 누적 시 페이지 새로고침)
  const handleCriticalError = useCallback(() => {
    errorCountRef.current += 1;

    if (errorCountRef.current >= MAX_ERRORS_BEFORE_RELOAD) {
      // 5회 연속 에러 발생 시 3초 후 자동 새로고침
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 3000);
    }
  }, []);

  // 프로덕션 환경 체크
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsProduction(isHttps || !isLocalhost);

      // HTTPS가 아닌 프로덕션 환경에서 경고
      if (!isHttps && !isLocalhost) {
        setError('시선 추적을 사용하려면 HTTPS 연결이 필요합니다. 보안 연결(https://)로 접속해주세요.');
      }
    }
  }, []);

  // MediaPipe 스크립트 로딩 (재시도 로직 포함)
  const loadMediaPipeScripts = async (retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      return await new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && typeof window.FaceMesh !== 'undefined') {
          resolve();
          return;
        }

        const scripts = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
        ];

        let loadedCount = 0;
        let hasError = false;

        scripts.forEach((src) => {
          const script = document.createElement('script');
          script.src = src;
          script.crossOrigin = 'anonymous';
          script.onload = () => {
            loadedCount++;
            if (loadedCount === scripts.length && !hasError) {
              setTimeout(() => resolve(), 200);
            }
          };
          script.onerror = (e) => {
            hasError = true;
            console.error(`스크립트 로드 실패: ${src}`, e);
            reject(new Error(`Failed to load script: ${src}`));
          };
          document.head.appendChild(script);
        });
      });
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return loadMediaPipeScripts(retryCount + 1);
      } else {
        handleCriticalError();
        throw error;
      }
    }
  };

  // 비디오 프레임 처리 (프레임 스킵 적용)
  const processVideoFrame = useCallback(async () => {
    if (!isTracking || !faceMeshRef.current || !videoRef.current) {
      return;
    }

    frameSkipCountRef.current++;

    // FRAME_SKIP 프레임마다 1번만 처리 (성능 최적화)
    if (frameSkipCountRef.current % FRAME_SKIP === 0) {
      try {
        if (videoRef.current.readyState >= 2 && faceMeshRef.current) {
          await faceMeshRef.current.send({ image: videoRef.current });
          // 성공하면 에러 카운터 리셋
          errorCountRef.current = 0;
        }
      } catch (error) {
        handleCriticalError();
      }
    }

    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
  }, [isTracking]);

  // EAR (Eye Aspect Ratio) 계산 - 눈의 개폐 정도 측정
  const calculateEAR = useCallback((landmarks: Landmark[], eyeIndices: number[]): number => {
    // eyeIndices: [outer, top1, top2, inner, bottom2, bottom1]
    // 세로 길이 2개 계산
    const vertical1 = Math.sqrt(
      Math.pow(landmarks[eyeIndices[1]].x - landmarks[eyeIndices[5]].x, 2) +
      Math.pow(landmarks[eyeIndices[1]].y - landmarks[eyeIndices[5]].y, 2)
    );
    const vertical2 = Math.sqrt(
      Math.pow(landmarks[eyeIndices[2]].x - landmarks[eyeIndices[4]].x, 2) +
      Math.pow(landmarks[eyeIndices[2]].y - landmarks[eyeIndices[4]].y, 2)
    );
    // 가로 길이 계산
    const horizontal = Math.sqrt(
      Math.pow(landmarks[eyeIndices[0]].x - landmarks[eyeIndices[3]].x, 2) +
      Math.pow(landmarks[eyeIndices[0]].y - landmarks[eyeIndices[3]].y, 2)
    );

    // EAR = (세로1 + 세로2) / (2 * 가로)
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }, []);

  // 적응형 EAR 임계값 업데이트 함수
  const updateAdaptiveThreshold = useCallback((currentEAR: number) => {
    // 현재 임계값보다 높은 EAR만 기록 (눈을 뜬 상태로 간주)
    if (currentEAR > adaptiveThresholdRef.current * 1.1) {
      baselineEARHistoryRef.current.push(currentEAR);

      // 히스토리 크기 제한 (최근 90프레임만 유지)
      if (baselineEARHistoryRef.current.length > BASELINE_HISTORY_SIZE) {
        baselineEARHistoryRef.current.shift();
      }

      // 충분한 샘플이 쌓이면 적응형 임계값 계산
      if (baselineEARHistoryRef.current.length >= BASELINE_MIN_SAMPLES) {
        // 최근 데이터의 평균 계산
        const avgEAR = baselineEARHistoryRef.current.reduce((a, b) => a + b, 0)
                       / baselineEARHistoryRef.current.length;

        // 평균의 85%를 새로운 임계값으로 설정 (부드러운 전환)
        const newThreshold = avgEAR * BASELINE_UPDATE_RATIO;

        // 스무딩 적용 (급격한 변화 방지)
        adaptiveThresholdRef.current = adaptiveThresholdRef.current * 0.95 + newThreshold * 0.05;

        // 임계값 범위 제한 (0.15 ~ 0.28)
        adaptiveThresholdRef.current = Math.max(0.15, Math.min(0.28, adaptiveThresholdRef.current));
      }
    }
  }, []);

  // 눈 깜빡임 감지 및 처리
  const detectBlink = useCallback((landmarks: Landmark[]) => {
    try {
      // 왼쪽 눈과 오른쪽 눈의 EAR 계산
      // 왼쪽 눈: 33(outer), 160(top), 159(top), 133(inner), 145(bottom), 144(bottom)
      const leftEAR = calculateEAR(landmarks, [33, 160, 159, 133, 145, 144]);
      // 오른쪽 눈: 263(outer), 387(top), 386(top), 362(inner), 374(bottom), 373(bottom)
      const rightEAR = calculateEAR(landmarks, [263, 387, 386, 362, 374, 373]);

      // 양쪽 눈의 평균 EAR
      const avgEAR = (leftEAR + rightEAR) / 2;

      // 적응형 임계값 업데이트
      updateAdaptiveThreshold(avgEAR);

      const currentTime = Date.now();
      const currentThreshold = adaptiveThresholdRef.current;

      // 디버깅: 30프레임마다 한 번씩 로그 출력 (1초에 1번)
      if (frameSkipCountRef.current % 30 === 0) {
        console.log(`[EAR] 현재: ${avgEAR.toFixed(3)} | 임계값: ${currentThreshold.toFixed(3)} | 샘플: ${baselineEARHistoryRef.current.length}`);
      }

      // 눈을 감은 상태 (EAR이 적응형 임계값 이하)
      if (avgEAR < currentThreshold) {
        if (!isBlinkingRef.current) {
          // 깜빡임 시작
          isBlinkingRef.current = true;
          blinkStartTimeRef.current = currentTime;
        }
      } else {
        // 눈을 뜬 상태
        if (isBlinkingRef.current && blinkStartTimeRef.current) {
          // 깜빡임 종료
          const blinkDuration = currentTime - blinkStartTimeRef.current;

          // 유효한 깜빡임인지 확인 (너무 길지 않은지)
          if (blinkDuration < MAX_BLINK_DURATION) {
            if (blinkDuration >= LONG_BLINK_DURATION) {
              // 긴 깜빡임 감지 - 뒤로가기
              onLongBlink?.();
            } else {
              // 짧은 깜빡임 감지
              lastBlinkTimesRef.current.push(currentTime);

              // 오래된 깜빡임 기록 제거 (DOUBLE_BLINK_WINDOW 이전 것들)
              lastBlinkTimesRef.current = lastBlinkTimesRef.current.filter(
                time => currentTime - time < DOUBLE_BLINK_WINDOW
              );

              // 짧은 깜빡임이 여러 번 발생했는지 확인
              if (lastBlinkTimesRef.current.length >= DOUBLE_BLINK_COUNT) {
                onDoubleBlink?.();
                // 기록 초기화
                lastBlinkTimesRef.current = [];
              }
            }
          }

          isBlinkingRef.current = false;
          blinkStartTimeRef.current = null;
        }
      }
    } catch (error) {
      handleCriticalError();
    }
  }, [calculateEAR, onLongBlink, onDoubleBlink, updateAdaptiveThreshold]);

  // Iris 중심점 계산
  const getIrisCenter = (landmarks: Landmark[], irisIndices: number[]): Position | null => {
    let sumX = 0, sumY = 0, count = 0;

    irisIndices.forEach(index => {
      if (landmarks[index]) {
        sumX += landmarks[index].x;
        sumY += landmarks[index].y;
        count++;
      }
    });

    if (count === 0) return null;

    return {
      x: sumX / count,
      y: sumY / count
    };
  };

  // Iris 위치 비율 계산
  const calculateIrisRatio = (irisCenter: Position, eyeBounds: EyeBounds): GazeRatio => {
    if (!irisCenter || !eyeBounds.outer || !eyeBounds.inner) {
      return { x: 0.5, y: 0.5 };
    }

    const eyeWidth = Math.abs(eyeBounds.outer.x - eyeBounds.inner.x);
    const eyeHeight = eyeBounds.top && eyeBounds.bottom ?
      Math.abs(eyeBounds.top.y - eyeBounds.bottom.y) : eyeWidth * 0.5;

    const eyeCenterX = (eyeBounds.outer.x + eyeBounds.inner.x) / 2;
    const eyeCenterY = eyeBounds.top && eyeBounds.bottom ?
      (eyeBounds.top.y + eyeBounds.bottom.y) / 2 : irisCenter.y;

    let ratioX = 0.5 + (irisCenter.x - eyeCenterX) / (eyeWidth * 0.8);
    let ratioY = 0.5 + (irisCenter.y - eyeCenterY) / (eyeHeight * 0.8);

    ratioX = Math.max(0.1, Math.min(0.9, ratioX));
    ratioY = Math.max(0.1, Math.min(0.9, ratioY));

    return { x: ratioX, y: ratioY };
  };

  // Zone 감지 함수 (화면 347:677:347 비율 기준)
  const detectZone = useCallback((position: Position) => {
    const now = Date.now();
    const screenWidth = window.innerWidth;
    const totalRatio = 347 + 677 + 347; // 1371
    const leftWidth = (screenWidth * 347) / totalRatio;
    const centerWidth = (screenWidth * 677) / totalRatio;

    // 현재 zone 계산 (347:677:347 비율)
    let newZone: 'left' | 'center' | 'right';
    if (position.x < leftWidth) {
      // 왼쪽 영역
      newZone = 'left';
    } else if (position.x < leftWidth + centerWidth) {
      // 중앙 영역
      newZone = 'center';
    } else {
      // 오른쪽 영역
      newZone = 'right';
    }

    const prevZone = currentZoneRef.current;

    // Zone이 변경되었고 center로 돌아왔을 때
    if (prevZone !== 'center' && newZone === 'center') {
      // 쿨다운 체크
      if (now - lastZoneChangeRef.current > ZONE_CHANGE_COOLDOWN) {
        if (prevZone === 'left' && onZoneChange) {
          onZoneChange('left');
          lastZoneChangeRef.current = now;
        } else if (prevZone === 'right' && onZoneChange) {
          onZoneChange('right');
          lastZoneChangeRef.current = now;
        }
      }
    }

    currentZoneRef.current = newZone;
  }, [onZoneChange, ZONE_CHANGE_COOLDOWN]);

  // 커서 업데이트 (화면 하단 절반으로 제한 + 각 영역별 중력 효과)
  const updateGazeCursor = (position: Position) => {
    if (!gazeCursorRef.current) return;

    // Y 좌표를 화면 하단 절반으로 제한
    const minY = window.innerHeight / 2;
    const maxY = window.innerHeight - 30;
    const constrainedY = Math.max(minY, Math.min(maxY, position.y));

    // X 좌표는 전체 범위 사용
    let constrainedX = Math.max(30, Math.min(window.innerWidth - 30, position.x));

    // 347:677:347 비율로 영역별 중력 효과 적용
    const screenWidth = window.innerWidth;
    const totalRatio = 347 + 677 + 347; // 1371
    const leftWidth = (screenWidth * 347) / totalRatio;
    const centerWidth = (screenWidth * 677) / totalRatio;
    const rightWidth = (screenWidth * 347) / totalRatio;

    // 현재 속한 영역 확인
    let zoneCenterX: number;
    let zoneWidth: number;
    if (constrainedX < leftWidth) {
      // 왼쪽 영역 중앙
      zoneCenterX = leftWidth / 2;
      zoneWidth = leftWidth;
    } else if (constrainedX < leftWidth + centerWidth) {
      // 중앙 영역 중앙
      zoneCenterX = leftWidth + centerWidth / 2;
      zoneWidth = centerWidth;
    } else {
      // 오른쪽 영역 중앙
      zoneCenterX = leftWidth + centerWidth + rightWidth / 2;
      zoneWidth = rightWidth;
    }

    // 해당 영역 중앙으로부터의 거리 계산
    const distanceFromZoneCenter = Math.abs(constrainedX - zoneCenterX);
    const gravityRadius = zoneWidth * 0.4; // 각 영역 너비의 40%에서 중력 작용

    if (distanceFromZoneCenter < gravityRadius) {
      // 해당 영역 중앙 근처에서 중력 작용
      const gravityRatio = distanceFromZoneCenter / gravityRadius; // 0(중앙) ~ 1(경계)
      const gravityPull = (1 - gravityRatio) * GRAVITY_STRENGTH;

      // 해당 영역 중앙으로 끌어당기기
      if (constrainedX < zoneCenterX) {
        constrainedX = constrainedX + (zoneCenterX - constrainedX) * gravityPull;
      } else {
        constrainedX = constrainedX - (constrainedX - zoneCenterX) * gravityPull;
      }
    }

    let targetX = constrainedX;
    let targetY = constrainedY;

    // 이전 유효한 위치 보존
    if (!lastValidPositionRef.current) {
      lastValidPositionRef.current = { x: constrainedX, y: constrainedY };
    } else {
      // 급격한 변화 제한 (점프 방지)
      const dx = constrainedX - lastValidPositionRef.current.x;
      const dy = constrainedY - lastValidPositionRef.current.y;

      if (Math.abs(dx) > MAX_POSITION_CHANGE) {
        targetX = lastValidPositionRef.current.x + Math.sign(dx) * MAX_POSITION_CHANGE;
      }
      if (Math.abs(dy) > MAX_POSITION_CHANGE) {
        targetY = lastValidPositionRef.current.y + Math.sign(dy) * MAX_POSITION_CHANGE;
      }

      lastValidPositionRef.current = { x: targetX, y: targetY };
    }

    // 초기화
    if (smoothedPositionRef.current.x === 0 && smoothedPositionRef.current.y === 0) {
      smoothedPositionRef.current = { x: targetX, y: targetY };
    }

    // 부드러운 스무딩 적용
    smoothedPositionRef.current.x += (targetX - smoothedPositionRef.current.x) * SMOOTHING_FACTOR;
    smoothedPositionRef.current.y += (targetY - smoothedPositionRef.current.y) * SMOOTHING_FACTOR;

    gazeCursorRef.current.style.left = smoothedPositionRef.current.x + 'px';
    gazeCursorRef.current.style.top = smoothedPositionRef.current.y + 'px';
    gazeCursorRef.current.style.display = 'block';
    gazeCursorRef.current.style.visibility = 'visible';
    gazeCursorRef.current.style.opacity = '1';

    // Zone 감지 호출
    detectZone(smoothedPositionRef.current);
  };

  // Iris 기반 시선 추적 계산
  const calculateIrisGaze = (landmarks: Landmark[]) => {
    try {
      // 눈 깜빡임 감지
      detectBlink(landmarks);

      const leftIrisCenter = getIrisCenter(landmarks, [468, 469, 470, 471, 472]);
      const rightIrisCenter = getIrisCenter(landmarks, [473, 474, 475, 476, 477]);

      if (!leftIrisCenter || !rightIrisCenter) {
        return;
      }

      const leftEyeBounds: EyeBounds = {
        outer: landmarks[33],
        inner: landmarks[133],
        top: landmarks[159],
        bottom: landmarks[145]
      };

      const rightEyeBounds: EyeBounds = {
        outer: landmarks[263],
        inner: landmarks[362],
        top: landmarks[386],
        bottom: landmarks[374]
      };

      const leftGazeRatio = calculateIrisRatio(leftIrisCenter, leftEyeBounds);
      const rightGazeRatio = calculateIrisRatio(rightIrisCenter, rightEyeBounds);

      const avgGazeRatio: GazeRatio = {
        x: (leftGazeRatio.x + rightGazeRatio.x) / 2,
        y: (leftGazeRatio.y + rightGazeRatio.y) / 2
      };

      lastGazeRatioRef.current = { x: avgGazeRatio.x, y: avgGazeRatio.y };

      const normalizedX = 1 - avgGazeRatio.x;
      const normalizedY = avgGazeRatio.y;

      const screenX = window.innerWidth * ((normalizedX - 0.5) * SENSITIVITY_X + 0.5);
      const screenY = window.innerHeight * ((normalizedY - 0.5) * SENSITIVITY_Y + 0.5);

      const boundedX = Math.max(30, Math.min(window.innerWidth - 30, screenX));
      const boundedY = Math.max(30, Math.min(window.innerHeight - 30, screenY));

      updateGazeCursor({ x: boundedX, y: boundedY });
    } catch (error) {
      console.error('Iris 시선 계산 오류:', error);
    }
  };

  // MediaPipe 결과 처리
  const onFaceMeshResults = useCallback((results: FaceMeshResults) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      calculateIrisGaze(landmarks);
    } else {
      if (gazeCursorRef.current) {
        gazeCursorRef.current.style.display = 'none';
      }
    }

    ctx.restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectZone]);

  // MediaPipe 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMediaPipe = async () => {
      try {
        setIsLoading(true);
        await loadMediaPipeScripts();

        if (typeof window !== 'undefined' && typeof window.FaceMesh !== 'undefined') {
          const faceMesh = new window.FaceMesh({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          faceMesh.onResults(onFaceMeshResults);
          faceMeshRef.current = faceMesh;

          setIsModelLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('MediaPipe Iris 초기화 실패:', error);
        setError('시선 추적 모델을 로드할 수 없습니다. 페이지를 새로고침해주세요.');
        setIsLoading(false);
      }
    };

    initMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onFaceMeshResults]);

  // isTracking 상태 변화 추적
  useEffect(() => {
    if (isTracking && faceMeshRef.current && videoRef.current) {
      processVideoFrame();
    } else if (!isTracking && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isTracking, processVideoFrame]);

  // 카메라 시작
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setCameraPermissionRequested(true);

      // HTTPS 체크
      if (typeof window !== 'undefined') {
        const isHttps = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

        if (!isHttps && !isLocalhost) {
          throw new Error('HTTPS 연결이 필요합니다. 보안 연결(https://)로 접속해주세요.');
        }
      }

      // 여러 constraint 시도
      const constraintsList = [
        { video: { width: 640, height: 480, facingMode: 'user' } },
        { video: { width: 640, height: 480 } },
        { video: true }
      ];

      let stream = null;
      let lastError = null;

      console.log('카메라 시작 시도...');

      for (let i = 0; i < constraintsList.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
          break;
        } catch (error) {
          console.log(`${i + 1}차 시도 실패:`, error);
          lastError = error;
        }
      }

      if (!stream) {
        const errorMessage = lastError instanceof Error ?
          (lastError.name === 'NotAllowedError' ?
            '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.' :
            lastError.name === 'NotFoundError' ?
            '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.' :
            lastError.name === 'NotReadableError' ?
            '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.' :
            '카메라를 시작할 수 없습니다.') :
          '카메라를 시작할 수 없습니다.';
        throw new Error(errorMessage);
      }

      // 스트림 연결
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsTracking(true);
              setIsLoading(false);
              setError('');
              console.log('✅ 카메라 시작 성공');
            })
            .catch((error) => {
              console.error('비디오 재생 실패:', error);
              setError('비디오 재생에 실패했습니다.');
              setIsLoading(false);
            });
        };
      }
    } catch (error: unknown) {
      console.error('카메라 시작 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '카메라를 시작할 수 없습니다.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // 모델 로드 후 즉시 카메라 시작
  useEffect(() => {
    if (isModelLoaded && !isTracking && !cameraPermissionRequested) {
      startCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelLoaded]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 카메라 권한 요청 UI - 프로덕션에서는 항상 표시 */}
      {!isTracking && isModelLoaded && !cameraPermissionRequested && isProduction && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500">
          <div className="text-center">
            <p className="text-sm mb-3 text-gray-700">시선 추적을 시작하시겠습니까?</p>
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? '시작 중...' : '시선 추적 시작'}
            </button>
            <p className="text-xs text-gray-500 mt-2">카메라 권한이 필요합니다</p>
          </div>
        </div>
      )}

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] bg-red-50 border-2 border-red-500 rounded-lg p-4 max-w-md">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-red-700">{error}</p>
              {!isTracking && cameraPermissionRequested && (
                <button
                  onClick={startCamera}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {isLoading && !error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
            <p className="text-sm text-blue-700">시선 추적 준비 중...</p>
          </div>
        </div>
      )}

      {/* 숨겨진 비디오와 캔버스 */}
      <div className="fixed top-0 left-0 opacity-0 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width={640}
          height={480}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
        />
      </div>

      {/* 시선 추적 커서 */}
      <div
        id="gaze-tracking-cursor"
        ref={gazeCursorRef}
        className="fixed pointer-events-none"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#ff0000',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.9)',
          boxShadow: `
            0 0 20px rgba(255, 0, 0, 1),
            0 0 40px rgba(255, 0, 0, 0.6),
            inset 0 0 8px rgba(255, 255, 255, 0.7)
          `,
          zIndex: 999999,
          display: 'none',
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.08s ease-out',
        }}
      >
        <div
          className="absolute inset-1 bg-white rounded-full opacity-70"
          style={{ animation: 'pulseAnimation 1.5s ease-in-out infinite' }}
        />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulseAnimation {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
          }
        `
      }} />

    </>
  );
};

export default IrisTracker;