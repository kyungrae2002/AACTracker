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

const IrisTracker: React.FC = () => {
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

  const SMOOTHING_FACTOR = 0.22; // 0.15 → 0.22 (반응성 개선, 여전히 부드러움 유지)
  const SENSITIVITY_X = 3.0;
  const SENSITIVITY_Y = 4.0;
  const FRAME_SKIP = 2; // 2프레임마다 1번만 처리 (성능 최적화)
  const MAX_POSITION_CHANGE = 70; // 50 → 70 (더 빠른 이동 허용)

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
        console.log(`스크립트 로드 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return loadMediaPipeScripts(retryCount + 1);
      } else {
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
        }
      } catch (error) {
        console.error('프레임 처리 오류:', error);
      }
    }

    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
  }, [isTracking]);

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

  // 커서 업데이트 (화면 하단 절반으로 제한 + 강화된 스무딩)
  const updateGazeCursor = (position: Position) => {
    if (!gazeCursorRef.current) return;

    // Y 좌표를 화면 하단 절반으로 제한
    const minY = window.innerHeight / 2;
    const maxY = window.innerHeight - 30;
    const constrainedY = Math.max(minY, Math.min(maxY, position.y));

    // X 좌표는 전체 범위 사용
    const constrainedX = Math.max(30, Math.min(window.innerWidth - 30, position.x));

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
  };

  // Iris 기반 시선 추적 계산
  const calculateIrisGaze = (landmarks: Landmark[]) => {
    try {
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
  }, []);

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
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!isHttps && !isLocalhost) {
          throw new Error('HTTPS 연결이 필요합니다. 보안 연결(https://)로 접속해주세요.');
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        throw new Error('카메라를 찾을 수 없습니다.');
      }

      // 여러 constraint 시도
      const constraintsList = [
        { video: { width: 640, height: 480, facingMode: 'user' } },
        { video: { width: 640, height: 480 } },
        { video: true },
        { video: { deviceId: videoDevices[0].deviceId } }
      ];

      let stream = null;
      let lastError = null;

      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!stream) {
        const errorMessage = lastError instanceof Error ?
          (lastError.name === 'NotAllowedError' ?
            '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.' :
            '카메라를 시작할 수 없습니다.') :
          '카메라를 시작할 수 없습니다.';
        throw new Error(errorMessage);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsTracking(true);
              setIsLoading(false);
              setError('');
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

  // 자동으로 카메라 시작 제거 - 수동 시작으로 변경
  // 프로덕션 환경에서는 사용자가 명시적으로 카메라를 시작해야 함
  useEffect(() => {
    // 로컬호스트에서만 자동 시작 (개발 편의성)
    if (isModelLoaded && !isTracking && !cameraPermissionRequested) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        startCamera();
      }
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