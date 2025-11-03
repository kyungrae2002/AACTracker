import React, { useEffect, useRef, useState, useCallback } from 'react';

// TypeScript 인터페이스 및 전역 타입 선언
interface Landmark {
  x: number;
  y: number;
  z?: number;
}

interface FaceMeshResults {
  multiFaceLandmarks?: Landmark[][];
}

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

const EyeBlinkDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [doubleBlinkCount, setDoubleBlinkCount] = useState(0);
  const [longBlinkCount, setLongBlinkCount] = useState(0);
  const [currentEAR, setCurrentEAR] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentBlinkType, setCurrentBlinkType] = useState<string>('');
  const [status, setStatus] = useState('⏳ MediaPipe FaceMesh 로딩 중...');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    faceDetected: false,
    detectionFPS: 0,
    lastDetectionTime: 0,
    detectionAttempts: 0,
    successfulDetections: 0,
  });

  // 상수 정의
  const EAR_THRESHOLD = 0.19;
  const EAR_CONSEC_FRAMES = 2;
  const MIN_BLINK_INTERVAL = 100;
  const DOUBLE_BLINK_MAX_INTERVAL = 1200;
  const DOUBLE_BLINK_MIN_INTERVAL = 200;
  const LONG_BLINK_DURATION = 1200;

  // Ref를 사용한 상태 관리 (리렌더링 방지)
  const blinkFrameCounterRef = useRef<number>(0);
  const earHistoryRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isBlinkingRef = useRef<boolean>(false);
  const lastBlinkTimeRef = useRef<number>(0);
  const previousBlinkTimeRef = useRef<number>(0);
  const eyesClosedStartTimeRef = useRef<number>(0);
  const longBlinkDetectedRef = useRef<boolean>(false);
  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // MediaPipe 스크립트 로딩
  const loadMediaPipeScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && typeof window.FaceMesh !== 'undefined') {
        console.log('✅ MediaPipe 이미 로드됨');
        resolve();
        return;
      }

      console.log('📦 MediaPipe FaceMesh 스크립트 로딩 시작...');
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
          console.log(`✅ 스크립트 로드 완료 (${loadedCount}/${scripts.length}): ${src.split('/').pop()}`);
          if (loadedCount === scripts.length) {
            console.log('🎉 모든 MediaPipe 스크립트 로드 완료!');
            setTimeout(() => resolve(), 200);
          }
        };
        script.onerror = (e) => {
          console.error(`❌ 스크립트 로드 실패: ${src}`, e);
          reject(new Error(`스크립트 로드 실패: ${src}`));
        };
        document.head.appendChild(script);
      });
    });
  };

  // 비디오 프레임 처리
  const processVideoFrame = useCallback(async () => {
    if (!isDetecting || !faceMeshRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
    }

    try {
        if (videoRef.current.readyState >= 2) {
            await faceMeshRef.current.send({ image: videoRef.current });
        }
    } catch (err) {
        console.error('💥 프레임 처리 오류:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isDetecting]);

  // isDetecting 상태 변화에 따른 프레임 처리 시작/정지
  useEffect(() => {
    if (isDetecting) {
      console.log('🚀 눈 깜빡임 감지 시작!');
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    } else {
      console.log('⏹️ 눈 깜빡임 감지 정지');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDetecting, processVideoFrame]);

  // MediaPipe 초기화
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        setIsLoading(true);
        console.log('🎬 MediaPipe FaceMesh 초기화 시작...');
        await loadMediaPipeScripts();

        if (window.FaceMesh) {
          console.log('🔧 FaceMesh 인스턴스 생성...');
          const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
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
          setStatus('✅ MediaPipe FaceMesh 준비 완료!');
          console.log('🎉 MediaPipe FaceMesh 초기화 완료!');
        } else {
          throw new Error('FaceMesh를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('💥 MediaPipe FaceMesh 초기화 실패:', err);
        const errorMessage = (err instanceof Error) ? err.message : String(err);
        setStatus(`❌ 초기화 실패: ${errorMessage}`);
        setError('MediaPipe 초기화에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    initMediaPipe();
  }, []);

  // 거리 계산 유틸리티
  const distance = useCallback((p1: Landmark, p2: Landmark): number => {
    if (!p1 || !p2) return 0;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }, []);

  // 눈 종횡비(EAR) 계산
  const calculateEAR = useCallback((landmarks: Landmark[]) => {
    const leftEye = [landmarks[159], landmarks[145], landmarks[33], landmarks[133], landmarks[158], landmarks[153]];
    const rightEye = [landmarks[386], landmarks[374], landmarks[263], landmarks[362], landmarks[385], landmarks[380]];

    const leftV1 = distance(leftEye[0], leftEye[1]);
    const leftV2 = distance(leftEye[4], leftEye[5]);
    const leftH = distance(leftEye[2], leftEye[3]);
    const leftEAR = (leftV1 + leftV2) / (2.0 * leftH);

    const rightV1 = distance(rightEye[0], rightEye[1]);
    const rightV2 = distance(rightEye[4], rightEye[5]);
    const rightH = distance(rightEye[2], rightEye[3]);
    const rightEAR = (rightV1 + rightV2) / (2.0 * rightH);
    
    return (leftEAR + rightEAR) / 2.0;
  }, [distance]);

  // EAR 값 스무딩
  const smoothEAR = useCallback((ear: number): number => {
    earHistoryRef.current.push(ear);
    if (earHistoryRef.current.length > 5) {
      earHistoryRef.current.shift();
    }
    const sum = earHistoryRef.current.reduce((a, b) => a + b, 0);
    return sum / earHistoryRef.current.length;
  }, []);

  // MediaPipe 결과 처리 및 깜빡임 감지 로직
  const onFaceMeshResults = useCallback((results: FaceMeshResults) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const now = performance.now();
    setDiagnostics(prev => ({
        ...prev,
        detectionAttempts: prev.detectionAttempts + 1,
        detectionFPS: prev.lastDetectionTime ? Math.round(1000 / (now - prev.lastDetectionTime)) : 0,
        lastDetectionTime: now,
    }));

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        setDiagnostics(prev => ({ ...prev, faceDetected: true, successfulDetections: prev.successfulDetections + 1 }));

        const rawEAR = calculateEAR(landmarks);
        const ear = smoothEAR(rawEAR);
        setCurrentEAR(ear);

        if (ear < EAR_THRESHOLD) {
            blinkFrameCounterRef.current++;
            if (blinkFrameCounterRef.current === EAR_CONSEC_FRAMES && !isBlinkingRef.current) {
                isBlinkingRef.current = true;
                eyesClosedStartTimeRef.current = now;
            }
            if (isBlinkingRef.current && !longBlinkDetectedRef.current) {
                if (now - eyesClosedStartTimeRef.current >= LONG_BLINK_DURATION) {
                    longBlinkDetectedRef.current = true;
                    setLongBlinkCount(prev => prev + 1);
                    setCurrentBlinkType('LONG BLINK');
                }
            }
        } else {
            if (isBlinkingRef.current && blinkFrameCounterRef.current >= EAR_CONSEC_FRAMES) {
                if (!longBlinkDetectedRef.current && now - lastBlinkTimeRef.current > MIN_BLINK_INTERVAL) {
                    setBlinkCount(prev => prev + 1);
                    setCurrentBlinkType('NORMAL BLINK');

                    if (now - previousBlinkTimeRef.current <= DOUBLE_BLINK_MAX_INTERVAL && now - previousBlinkTimeRef.current >= DOUBLE_BLINK_MIN_INTERVAL) {
                        setDoubleBlinkCount(prev => prev + 1);
                        setCurrentBlinkType('DOUBLE BLINK');
                        previousBlinkTimeRef.current = 0;
                    } else {
                        previousBlinkTimeRef.current = now;
                    }
                    lastBlinkTimeRef.current = now;
                }
            }
            blinkFrameCounterRef.current = 0;
            isBlinkingRef.current = false;
            longBlinkDetectedRef.current = false;
        }
    } else {
        setDiagnostics(prev => ({ ...prev, faceDetected: false }));
    }

    ctx.restore();
  }, [calculateEAR, smoothEAR]);
  
  // 카메라 시작
  const startCamera = async () => {
    try {
        console.log('🎬 카메라 시작...');
        setStatus('📹 카메라 연결 중...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        console.log('✅ 비디오 스트림 획득');

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            videoRef.current.onloadedmetadata = () => {
                console.log('🎯 비디오 메타데이터 로드 완료');
                videoRef.current?.play();
                if (canvasRef.current && videoRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                }
                setIsDetecting(true);
                setStatus('👁️ 눈 깜빡임 감지 중...');
            };
        }
    } catch (err) {
        console.error('💥 카메라 시작 실패:', err);
        const errorMessage = (err instanceof Error) ? err.message : String(err);
        setStatus(`❌ 카메라 오류: ${errorMessage}`);
        setError('카메라 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
    }
  };

  // 카메라 정지
  const stopCamera = () => {
    console.log('🛑 카메라 정지');
    setIsDetecting(false);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setStatus('⏹️ 카메라 정지됨');
  };

  // 자동 카메라 시작 (모델 로드 완료 후)
  useEffect(() => {
    if (isModelLoaded && !isDetecting) {
        console.log('🚀 자동으로 카메라 시작...');
        startCamera();
    }
  }, [isModelLoaded]);

  // 시작/중지 토글
  const toggleDetection = () => {
    if (isDetecting) {
        stopCamera();
    } else {
        startCamera();
    }
  };

  // 카운터 리셋
  const resetCounter = () => {
    setBlinkCount(0);
    setDoubleBlinkCount(0);
    setLongBlinkCount(0);
    setCurrentBlinkType('');
    blinkFrameCounterRef.current = 0;
    earHistoryRef.current = [];
    isBlinkingRef.current = false;
    lastBlinkTimeRef.current = 0;
    previousBlinkTimeRef.current = 0;
    eyesClosedStartTimeRef.current = 0;
    longBlinkDetectedRef.current = false;
    console.log('🔄 All counters reset');
  };
  
  // 컴포넌트 렌더링
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#f4f7f6',
      minHeight: '100vh',
    }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>👁️ Advanced Eye Blink Detector</h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        MediaPipe FaceMesh CDN Version
      </p>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px', maxWidth: '600px', border: '1px solid #f5c6cb' }}>
          <strong>오류:</strong> {error}
        </div>
      )}

      <div style={{ padding: '10px 20px', backgroundColor: isModelLoaded ? '#d4edda' : '#fff3cd', color: isModelLoaded ? '#155724' : '#856404', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', width: '640px', textAlign: 'center' }}>
        {status}
      </div>

      <div style={{ position: 'relative', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)', borderRadius: '8px', overflow: 'hidden', width: '640px', height: '480px', backgroundColor: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', transform: 'scaleX(-1)', display: 'block' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button onClick={toggleDetection} disabled={!isModelLoaded || isLoading} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', backgroundColor: isDetecting ? '#e74c3c' : '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: isModelLoaded && !isLoading ? 'pointer' : 'not-allowed', opacity: isModelLoaded && !isLoading ? 1 : 0.6, transition: 'all 0.3s' }}>
          {isDetecting ? '⏹ 중지' : '▶ 시작'}
        </button>
        <button onClick={resetCounter} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s' }}>
          🔄 리셋
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', width: '640px', marginBottom: '20px' }}>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Normal Blinks</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#2ecc71' }}>{blinkCount}</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', border: currentBlinkType === 'DOUBLE BLINK' ? '3px solid #9b59b6' : '3px solid transparent', transition: 'border 0.2s' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Double Blinks</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#9b59b6' }}>{doubleBlinkCount}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>{DOUBLE_BLINK_MIN_INTERVAL}-{DOUBLE_BLINK_MAX_INTERVAL}ms</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', border: currentBlinkType === 'LONG BLINK' ? '3px solid #f39c12' : '3px solid transparent', transition: 'border 0.2s' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Long Blinks</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#f39c12' }}>{longBlinkCount}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>≥{LONG_BLINK_DURATION / 1000}s</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', width: '640px', marginBottom: '20px' }}>
        <div style={{ flex: 1, padding: '15px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>Current EAR: </span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: currentEAR < EAR_THRESHOLD ? '#e74c3c' : '#2ecc71' }}>{currentEAR.toFixed(3)}</span>
        </div>
        <div style={{ flex: 2, backgroundColor: '#fff', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>🔍 Detection Diagnostics</h3>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#666' }}>
            <span style={{ color: diagnostics.faceDetected ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>{diagnostics.faceDetected ? 'Face Detected ✅' : 'No Face ❌'}</span> | 
            Rate: {diagnostics.detectionFPS} FPS | 
            Success: {diagnostics.detectionAttempts > 0 ? `${((diagnostics.successfulDetections / diagnostics.detectionAttempts) * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EyeBlinkDetector;