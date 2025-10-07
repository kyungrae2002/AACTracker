'use client';

import React from 'react';

interface AALayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  blinkMode: 'single' | 'double';
  onBlinkModeChange: (mode: 'single' | 'double') => void;
  outputText?: string;
  isDesktop?: boolean;
}

export default function AALayout({
  children,
  title = '상황 선택',
  onBack,
  blinkMode,
  onBlinkModeChange,
  outputText = '',
  isDesktop = false,
}: AALayoutProps) {
  // 디바이스별 스타일 변수 (크기 축소)
  const backButtonWidth = isDesktop ? '180px' : '150px';
  const buttonHeight = '60px'; // 버튼 높이 축소
  const titleFontSize = isDesktop ? '32px' : '28px';
  const modeFontSize = isDesktop ? '32px' : '28px';
  const outputHeight = isDesktop ? '110px' : '90px';
  const outputFontSize = isDesktop ? '36px' : '32px';
  const buttonFontSize = '24px'; // 버튼 텍스트 크기 축소

  return (
    <div className="relative w-screen h-screen bg-[#15171A] overflow-hidden">
      {/* 상단 영역 - 위치 조정 */}
      <div className="absolute left-[56px] right-[56px] top-[40px]">
        <div className="flex items-start justify-between">
          {/* 좌측: 뒤로가기 + 깜--빡 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onBack}
              className="flex items-center justify-center"
              style={{
                width: backButtonWidth,
                height: buttonHeight,
                padding: '15px 25px',
                border: '2px solid #4AC1F8',
                borderRadius: '8px',
              }}
            >
              <span
                className="font-pretendard font-semibold text-[#4AC1F8]"
                style={{
                  fontSize: buttonFontSize,
                  lineHeight: '30px',
                }}
              >
                뒤로가기
              </span>
            </button>
            <button
              onClick={() => onBlinkModeChange('single')}
              className={`font-pretendard font-semibold transition-colors text-center ${
                blinkMode === 'single' ? 'text-white' : 'text-[#656565]'
              }`}
              style={{
                fontSize: modeFontSize,
                lineHeight: modeFontSize,
              }}
            >
              깜--빡
            </button>
          </div>

          {/* 중앙: 제목 */}
          <h1
            className="font-pretendard font-semibold text-white"
            style={{
              fontSize: titleFontSize,
              lineHeight: titleFontSize,
              marginTop: '15px',
            }}
          >
            {title}
          </h1>

          {/* 우측: 이모티콘/문장 + 깜빡깜빡 */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                className="flex items-center justify-center bg-[#4AC1F8] rounded-lg"
                style={{
                  width: '140px',
                  height: buttonHeight,
                  padding: '15px 20px',
                }}
              >
                <span
                  className="font-pretendard font-semibold text-[#15171A]"
                  style={{
                    fontSize: buttonFontSize,
                    lineHeight: '30px',
                  }}
                >
                  이모티콘
                </span>
              </button>
              <button
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: '140px',
                  height: buttonHeight,
                  padding: '15px 20px',
                  border: '2px solid #4AC1F8',
                }}
              >
                <span
                  className="font-pretendard font-semibold text-[#4AC1F8]"
                  style={{
                    fontSize: buttonFontSize,
                    lineHeight: '30px',
                  }}
                >
                  문장
                </span>
              </button>
            </div>
            <button
              onClick={() => onBlinkModeChange('double')}
              className={`font-pretendard font-semibold transition-colors text-center ${
                blinkMode === 'double' ? 'text-white' : 'text-[#656565]'
              }`}
              style={{
                fontSize: modeFontSize,
                lineHeight: modeFontSize,
              }}
            >
              깜빡깜빡
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 (버튼들) */}
      {children}

      {/* 하단 텍스트 출력 영역 */}
      <div
        className="absolute flex items-center justify-center rounded-lg"
        style={{
          left: '56px',
          bottom: '50px',
          right: '56px',
          height: outputHeight,
          padding: '30px 34px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '2px solid #FFFFFF',
        }}
      >
        <span
          className="font-pretendard font-semibold text-white"
          style={{
            fontSize: outputFontSize,
            lineHeight: outputFontSize,
          }}
        >
          {outputText}
        </span>
      </div>
    </div>
  );
}