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

  // MediaPipe 스크립트 로딩
  const loadMediaPipeScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
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

      scripts.forEach((src) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          loadedCount++;
          if (loadedCount === scripts.length) {
            setTimeout(() => resolve(), 200);
          }
        };
        script.onerror = (e) => {
          console.error(`스크립트 로드 실패: ${src}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    });
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
        }
      } catch (error) {
        console.error('MediaPipe Iris 초기화 실패:', error);
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
        throw lastError || new Error('카메라를 시작할 수 없습니다.');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsTracking(true);
            })
            .catch((error) => {
              console.error('비디오 재생 실패:', error);
            });
        };
      }
    } catch (error: unknown) {
      console.error('카메라 시작 실패:', error);
    }
  };

  // 자동으로 카메라 시작
  useEffect(() => {
    if (isModelLoaded && !isTracking) {
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