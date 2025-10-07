'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CalibrationPoint {
  gazeX: number;
  gazeY: number;
  screenX: number;
  screenY: number;
}

interface CalibrationMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

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
  const [status, setStatus] = useState('⏳ MediaPipe Iris 로딩 중...');
  const [debugInfo, setDebugInfo] = useState('');
  const [eyeData, setEyeData] = useState('');
  const [sensitivity, setSensitivity] = useState(3.0);
  const [sensitivityY, setSensitivityY] = useState(4.0);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([]);
  const [calibrationMatrix, setCalibrationMatrix] = useState<CalibrationMatrix | null>(null);
  const [calibrationOffsets, setCalibrationOffsets] = useState<Position>({ x: 0, y: 0 });

  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedPositionRef = useRef<Position>({ x: 0, y: 0 });
  const lastGazeRatioRef = useRef<GazeRatio>({ x: 0.5, y: 0.5 });
  const smoothingFactor = 0.3;

  // MediaPipe 스크립트 로딩 (Iris 포함)
  const loadMediaPipeScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && typeof window.FaceMesh !== 'undefined') {
        // // console.log('✅ MediaPipe 이미 로드됨');
        resolve();
        return;
      }

      // // console.log('📦 MediaPipe Iris 스크립트 로딩 시작...');
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
          // // console.log(`✅ 스크립트 로드 완료 (${loadedCount}/${scripts.length}): ${src.split('/').pop()}`);
          if (loadedCount === scripts.length) {
            // // console.log('🎉 모든 MediaPipe 스크립트 로드 완료!');
            setTimeout(() => resolve(), 200);
          }
        };
        script.onerror = (e) => {
          console.error(`❌ 스크립트 로드 실패: ${src}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    });
  };

  // 비디오 프레임 처리 함수를 먼저 정의
  const processVideoFrame = useCallback(async () => {
    if (!isTracking || !faceMeshRef.current || !videoRef.current) {
      return;
    }

    try {
      if (videoRef.current.readyState >= 2 && faceMeshRef.current) {
        await faceMeshRef.current.send({ image: videoRef.current });
      }
    } catch (error) {
      console.error('💥 프레임 처리 오류:', error);
    }

    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
  }, [isTracking]);

  // isTracking 상태 변화 추적
  useEffect(() => {
    // // console.log('🔄 isTracking 상태:', isTracking);

    if (isTracking && faceMeshRef.current && videoRef.current) {
      // // console.log('🚀 Iris 추적 루프 시작!');
      processVideoFrame();
    } else if (!isTracking && animationFrameRef.current) {
      // // console.log('⏹️ Iris 추적 루프 정지');
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isTracking, processVideoFrame]);

  // MediaPipe 초기화 (Iris 모드)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const initMediaPipe = async () => {
      try {
        // console.log('🎬 MediaPipe Iris 초기화 시작...');
        await loadMediaPipeScripts();

        if (typeof window !== 'undefined' && typeof window.FaceMesh !== 'undefined') {
          // console.log('🔧 FaceMesh 인스턴스 생성 (Iris 모드)...');

          const faceMesh = new window.FaceMesh({
            locateFile: (file: string) => {
              const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
              // console.log(`📁 파일 요청: ${url}`);
              return url;
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
          setStatus('✅ MediaPipe Iris 준비 완료! 카메라를 시작하세요.');
          // console.log('🎉 MediaPipe Iris 초기화 완료!');
        } else {
          throw new Error('FaceMesh를 찾을 수 없습니다');
        }
      } catch (error) {
        console.error('💥 MediaPipe Iris 초기화 실패:', error);
        setStatus(`❌ MediaPipe Iris 초기화 실패: ${(error as Error).message}`);
      }
    };

    initMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // MediaPipe 결과 처리 (Iris 전용)
  const onFaceMeshResults = useCallback((results: FaceMeshResults) => {
    // console.log('📊 MediaPipe Iris 결과 받음');

    if (!canvasRef.current) {
      // console.log('❌ 캔버스 없음');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      // console.log(`✅ 얼굴 감지됨! 랜드마크 개수: ${landmarks.length}`);

      drawIrisLandmarks(ctx, landmarks, canvas);
      calculateIrisGaze(landmarks);

      setDebugInfo(`Iris 추적 중, 랜드마크: ${landmarks.length}개`);

    } else {
      // console.log('❌ 얼굴 감지 안됨');
      setDebugInfo('얼굴이 감지되지 않음');
      setEyeData('감지 대기 중...');

      if (gazeCursorRef.current) {
        gazeCursorRef.current.style.display = 'none';
      }
    }

    ctx.restore();
  }, [isTracking, sensitivity, sensitivityY, calibrationOffsets, calibrationMatrix]);

  // Iris 랜드마크 그리기
  const drawIrisLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], canvas: HTMLCanvasElement) => {
    const leftIrisIndices = [468, 469, 470, 471, 472];
    const rightIrisIndices = [473, 474, 475, 476, 477];

    const leftEyeOutline = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    const rightEyeOutline = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    leftEyeOutline.forEach((index, i) => {
      if (landmarks[index]) {
        const point = landmarks[index];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    rightEyeOutline.forEach((index, i) => {
      if (landmarks[index]) {
        const point = landmarks[index];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#ff0000';

    leftIrisIndices.forEach(index => {
      if (landmarks[index]) {
        const point = landmarks[index];
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    rightIrisIndices.forEach(index => {
      if (landmarks[index]) {
        const point = landmarks[index];
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#00ff00';
    const leftIrisCenter = getIrisCenter(landmarks, leftIrisIndices);
    const rightIrisCenter = getIrisCenter(landmarks, rightIrisIndices);

    if (leftIrisCenter) {
      ctx.beginPath();
      ctx.arc(leftIrisCenter.x * canvas.width, leftIrisCenter.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (rightIrisCenter) {
      ctx.beginPath();
      ctx.arc(rightIrisCenter.x * canvas.width, rightIrisCenter.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

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

  // Iris 기반 시선 추적 계산
  const calculateIrisGaze = (landmarks: Landmark[]) => {
    try {
      // console.log('👁️ Iris 기반 시선 계산 시작...');

      const leftIrisCenter = getIrisCenter(landmarks, [468, 469, 470, 471, 472]);
      const rightIrisCenter = getIrisCenter(landmarks, [473, 474, 475, 476, 477]);

      if (!leftIrisCenter || !rightIrisCenter) {
        // console.log('❌ Iris 중심점 감지 실패');
        return;
      }

      // console.log('🔍 왼쪽 Iris 중심:', leftIrisCenter);
      // console.log('🔍 오른쪽 Iris 중심:', rightIrisCenter);

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

      // console.log('📊 왼쪽 Iris 비율:', leftGazeRatio);
      // console.log('📊 오른쪽 Iris 비율:', rightGazeRatio);

      const avgGazeRatio: GazeRatio = {
        x: (leftGazeRatio.x + rightGazeRatio.x) / 2,
        y: (leftGazeRatio.y + rightGazeRatio.y) / 2
      };

      lastGazeRatioRef.current = { x: avgGazeRatio.x, y: avgGazeRatio.y };

      // console.log('🎯 평균 Iris 비율:', avgGazeRatio);

      let screenX: number, screenY: number;

      if (calibrationMatrix) {
        const { a, b, c, d, tx, ty } = calibrationMatrix;
        screenX = a * avgGazeRatio.x + b * avgGazeRatio.y + tx;
        screenY = c * avgGazeRatio.x + d * avgGazeRatio.y + ty;
        // console.log('🎯 고급 캘리브레이션 적용:', { screenX, screenY });
      } else {
        const normalizedX = 1 - avgGazeRatio.x;
        const normalizedY = avgGazeRatio.y;

        const adjustedX = normalizedX + calibrationOffsets.x;
        const adjustedY = normalizedY + calibrationOffsets.y;

        screenX = window.innerWidth * ((adjustedX - 0.5) * sensitivity + 0.5);
        screenY = window.innerHeight * ((adjustedY - 0.5) * sensitivityY + 0.5);
      }

      // console.log('🖥️ 계산된 화면 좌표:', { screenX, screenY });

      const boundedX = Math.max(30, Math.min(window.innerWidth - 30, screenX));
      const boundedY = Math.max(30, Math.min(window.innerHeight - 30, screenY));

      updateGazeCursor({ x: boundedX, y: boundedY });

      setEyeData(`L:(${leftGazeRatio.x.toFixed(2)},${leftGazeRatio.y.toFixed(2)}) R:(${rightGazeRatio.x.toFixed(2)},${rightGazeRatio.y.toFixed(2)}) 평균:(${avgGazeRatio.x.toFixed(2)},${avgGazeRatio.y.toFixed(2)})`);

    } catch (error) {
      console.error('💥 Iris 시선 계산 오류:', error);
      setDebugInfo(`Iris 계산 오류: ${(error as Error).message}`);
    }
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

  // 커서 업데이트 (화면 하단 절반으로 제한)
  const updateGazeCursor = (position: Position) => {
    if (!gazeCursorRef.current) return;

    // Y 좌표를 화면 하단 절반으로 제한
    const minY = window.innerHeight / 2;
    const maxY = window.innerHeight - 30;
    const constrainedY = Math.max(minY, Math.min(maxY, position.y));

    // X 좌표는 전체 범위 사용
    const constrainedX = Math.max(30, Math.min(window.innerWidth - 30, position.x));

    if (smoothedPositionRef.current.x === 0 && smoothedPositionRef.current.y === 0) {
      smoothedPositionRef.current = { x: constrainedX, y: constrainedY };
    }

    smoothedPositionRef.current.x += (constrainedX - smoothedPositionRef.current.x) * smoothingFactor;
    smoothedPositionRef.current.y += (constrainedY - smoothedPositionRef.current.y) * smoothingFactor;

    gazeCursorRef.current.style.left = smoothedPositionRef.current.x + 'px';
    gazeCursorRef.current.style.top = smoothedPositionRef.current.y + 'px';
    gazeCursorRef.current.style.display = 'block';
    gazeCursorRef.current.style.visibility = 'visible';
    gazeCursorRef.current.style.opacity = '1';
  };


  // 카메라 시작
  const startCamera = async () => {
    try {
      // console.log('🎬 Iris 추적 카메라 시작...');
      setStatus('📹 카메라 연결 중...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      // console.log('✅ 비디오 스트림 획득');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          // console.log('🎯 비디오 메타데이터 로드 완료');
          videoRef.current?.play(); // 비디오 재생 시작
          setIsTracking(true);
          setStatus('👁️ Iris 추적 중...');
        };
      }

    } catch (error) {
      console.error('💥 카메라 시작 실패:', error);
      setStatus(`❌ 카메라 오류: ${(error as Error).message}`);
    }
  };

  // 컴포넌트 마운트 시 자동으로 카메라 시작
  useEffect(() => {
    if (isModelLoaded && !isTracking) {
      // console.log('🚀 자동으로 카메라 시작...');
      startCamera();
    }
  }, [isModelLoaded]);

  // 카메라 정지
  const stopCamera = () => {
    // console.log('🛑 Iris 추적 카메라 정지');
    setIsTracking(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (gazeCursorRef.current) {
      gazeCursorRef.current.style.display = 'none';
    }

    setStatus('⏹️ 카메라 정지됨');
    setDebugInfo('');
    setEyeData('');
  };

  // 간단한 캘리브레이션
  const quickCalibrate = () => {
    if (!isTracking) {
      alert('먼저 시선 추적을 시작해주세요.');
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const currentX = parseFloat(gazeCursorRef.current?.style.left || '0');
    const currentY = parseFloat(gazeCursorRef.current?.style.top || '0');
    // console.log('🎯 현재 커서 위치:', { currentX, currentY });

    const offsetX = (centerX - currentX) / window.innerWidth * 0.5;
    const offsetY = (centerY - currentY) / window.innerHeight * 0.5;

    setCalibrationOffsets({ x: offsetX, y: offsetY });
    setDebugInfo(`캘리브레이션 완료! 오프셋: (${offsetX.toFixed(3)}, ${offsetY.toFixed(3)})`);
    // console.log('🎯 캘리브레이션 완료:', { offsetX, offsetY });
  };

  // 5점 캘리브레이션 시작
  const startAdvancedCalibration = () => {
    if (!isTracking) {
      alert('먼저 시선 추적을 시작해주세요.');
      return;
    }

    setCalibrationMode(true);
    setCalibrationStep(1);
    setCalibrationPoints([]);
    setCalibrationMatrix(null);
    setDebugInfo('🎯 5점 캘리브레이션 시작! 빨간 점을 바라보고 클릭하세요 (1/5)');
    // console.log('🎯 5점 캘리브레이션 시작');
  };

  // 캘리브레이션 점 수집
  const collectCalibrationPoint = () => {
    if (!calibrationMode || !gazeCursorRef.current) return;

    const currentGazeRatio = lastGazeRatioRef.current;
    if (!currentGazeRatio) {
      alert('홍채를 감지할 수 없습니다. 카메라를 확인해주세요.');
      return;
    }

    const targetPoints = [
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 },
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.2 },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.2 },
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.8 },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.8 }
    ];

    const target = targetPoints[calibrationStep - 1];
    const point: CalibrationPoint = {
      gazeX: currentGazeRatio.x,
      gazeY: currentGazeRatio.y,
      screenX: target.x,
      screenY: target.y
    };

    const newPoints = [...calibrationPoints, point];
    setCalibrationPoints(newPoints);

    // console.log(`✅ 캘리브레이션 점 ${calibrationStep}/5 수집:`, point);

    if (calibrationStep < 5) {
      setCalibrationStep(calibrationStep + 1);
      setDebugInfo(`🎯 캘리브레이션 진행 중... 다음 빨간 점을 바라보고 클릭하세요 (${calibrationStep + 1}/5)`);
    } else {
      const matrix = calculateTransformMatrix(newPoints);
      setCalibrationMatrix(matrix);
      setCalibrationMode(false);
      setCalibrationStep(0);
      setDebugInfo('🎉 5점 캘리브레이션 완료! 고정밀 시선 추적이 활성화되었습니다.');
      // console.log('🎉 5점 캘리브레이션 완료, 변환 행렬:', matrix);
    }
  };

  // 변환 행렬 계산
  const calculateTransformMatrix = (points: CalibrationPoint[]): CalibrationMatrix | null => {
    if (points.length < 3) return null;

    let sumGx = 0, sumGy = 0, sumSx = 0, sumSy = 0;
    let sumGxSx = 0, sumGySx = 0, sumGxSy = 0, sumGySy = 0;
    let sumGxGx = 0, sumGyGy = 0;
    const n = points.length;

    points.forEach(p => {
      sumGx += p.gazeX;
      sumGy += p.gazeY;
      sumSx += p.screenX;
      sumSy += p.screenY;
      sumGxSx += p.gazeX * p.screenX;
      sumGySx += p.gazeY * p.screenX;
      sumGxSy += p.gazeX * p.screenY;
      sumGySy += p.gazeY * p.screenY;
      sumGxGx += p.gazeX * p.gazeX;
      sumGyGy += p.gazeY * p.gazeY;
    });

    const a = (n * sumGxSx - sumGx * sumSx) / (n * sumGxGx - sumGx * sumGx);
    const b = (n * sumGySx - sumGy * sumSx) / (n * sumGyGy - sumGy * sumGy);
    const tx = (sumSx - a * sumGx - b * sumGy) / n;

    const c = (n * sumGxSy - sumGx * sumSy) / (n * sumGxGx - sumGx * sumGx);
    const d = (n * sumGySy - sumGy * sumSy) / (n * sumGyGy - sumGy * sumGy);
    const ty = (sumSy - c * sumGx - d * sumGy) / n;

    return { a, b, c, d, tx, ty };
  };

  // 캘리브레이션 리셋
  const resetCalibration = () => {
    setCalibrationOffsets({ x: 0, y: 0 });
    setCalibrationMode(false);
    setCalibrationStep(0);
    setCalibrationPoints([]);
    setCalibrationMatrix(null);
    setDebugInfo('🔄 모든 캘리브레이션 리셋됨');
    // console.log('🔄 캘리브레이션 리셋');
  };

  // 테스트 커서
  const showTestCursor = () => {
    if (gazeCursorRef.current) {
      const element = gazeCursorRef.current;

      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.left = (window.innerWidth / 2) + 'px';
      element.style.top = (window.innerHeight / 2) + 'px';
      element.style.transform = 'translate(-50%, -50%)';
      element.style.zIndex = '99999';
      element.style.position = 'fixed';
      element.style.pointerEvents = 'none';

      element.style.width = '30px';
      element.style.height = '30px';
      element.style.backgroundColor = '#ff0000';
      element.style.border = '5px solid white';
      element.style.borderRadius = '50%';
      element.style.boxShadow = '0 0 20px rgba(255, 0, 0, 1)';

      setDebugInfo('🔴 강화된 테스트 커서 표시됨 - 빨간 원이 화면 중앙에 보이시나요?');
    }
  };

  return (
    <>
      {/* 숨겨진 비디오와 캔버스 (화면에 표시되지 않음) */}
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

      {/* 시선 추적 빨간 점 커서 */}
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
