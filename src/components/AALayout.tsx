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

// 스타일 상수
const STYLES = {
  desktop: {
    backButtonWidth: '180px',
    titleFontSize: '32px',
    modeFontSize: '32px',
    outputHeight: '110px',
    outputFontSize: '36px',
  },
  mobile: {
    backButtonWidth: '150px',
    titleFontSize: '28px',
    modeFontSize: '28px',
    outputHeight: '90px',
    outputFontSize: '32px',
  },
  common: {
    buttonHeight: '60px',
    buttonFontSize: '24px',
    sideButtonWidth: '140px',
  }
};

export default function AALayout({
  children,
  title = '상황 선택',
  onBack,
  blinkMode,
  onBlinkModeChange,
  outputText = '',
  isDesktop = false,
}: AALayoutProps) {
  const style = isDesktop ? STYLES.desktop : STYLES.mobile;
  const { buttonHeight, buttonFontSize, sideButtonWidth } = STYLES.common;

  return (
    <div className="relative w-screen h-screen bg-[#15171A] overflow-hidden">
      {/* 상단 영역 */}
      <div className="absolute left-[56px] right-[56px] top-[40px]">
        <div className="flex items-start justify-between">
          {/* 좌측: 뒤로가기 + 깜--빡 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onBack}
              className="flex items-center justify-center"
              style={{
                width: style.backButtonWidth,
                height: buttonHeight,
                padding: '15px 25px',
                border: '2px solid #4AC1F8',
                borderRadius: '8px',
              }}
            >
              <span
                className="font-pretendard font-semibold text-[#4AC1F8]"
                style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
              >
                뒤로가기
              </span>
            </button>
            <button
              onClick={() => onBlinkModeChange('single')}
              className={`font-pretendard font-semibold transition-colors text-center ${
                blinkMode === 'single' ? 'text-white' : 'text-[#656565]'
              }`}
              style={{ fontSize: style.modeFontSize, lineHeight: style.modeFontSize }}
            >
              깜--빡
            </button>
          </div>

          {/* 중앙: 제목 */}
          <h1
            className="font-pretendard font-semibold text-white"
            style={{
              fontSize: style.titleFontSize,
              lineHeight: style.titleFontSize,
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
                  width: sideButtonWidth,
                  height: buttonHeight,
                  padding: '15px 20px',
                }}
              >
                <span
                  className="font-pretendard font-semibold text-[#15171A]"
                  style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
                >
                  이모티콘
                </span>
              </button>
              <button
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: sideButtonWidth,
                  height: buttonHeight,
                  padding: '15px 20px',
                  border: '2px solid #4AC1F8',
                }}
              >
                <span
                  className="font-pretendard font-semibold text-[#4AC1F8]"
                  style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
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
              style={{ fontSize: style.modeFontSize, lineHeight: style.modeFontSize }}
            >
              깜빡깜빡
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      {children}

      {/* 하단 텍스트 출력 영역 */}
      <div
        className="absolute flex items-center justify-center rounded-lg"
        style={{
          left: '56px',
          bottom: '50px',
          right: '56px',
          height: style.outputHeight,
          padding: '30px 34px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '2px solid #FFFFFF',
        }}
      >
        <span
          className="font-pretendard font-semibold text-white"
          style={{ fontSize: style.outputFontSize, lineHeight: style.outputFontSize }}
        >
          {outputText}
        </span>
      </div>
    </div>
  );
}