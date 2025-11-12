'use client';

import React from 'react';

interface AALayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  outputText?: string;
  isDesktop?: boolean;
  buttonContainerLeft?: number;
  buttonContainerWidth?: number;
}

// 스타일 상수
const STYLES = {
  desktop: {
    backButtonWidth: '180px',
    titleFontSize: '32px',
    outputHeight: '110px',
    outputFontSize: '36px',
  },
  mobile: {
    backButtonWidth: '150px',
    titleFontSize: '28px',
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
  outputText = '',
  isDesktop = false,
  buttonContainerLeft,
  buttonContainerWidth,
}: AALayoutProps) {
  const style = isDesktop ? STYLES.desktop : STYLES.mobile;

  return (
    <div className="relative w-screen h-screen bg-[#FFF2DB] overflow-hidden">
      {/* 중앙 영역 배경 (347:677:347 비율) */}
      <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{ width: '25.3%' }}></div>
        <div style={{ width: '49.4%', background: '#FFE7BD' }}></div>
        <div style={{ width: '25.3%' }}></div>
      </div>

      {/* 배경 장식 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ zIndex: 2 }}>
        {/* 왼쪽 원형 */}
        <div className="absolute w-[662px] h-[662px] left-[371px] top-[74px] bg-[rgba(113,113,113,0.15)] rounded-full" />
        {/* 왼쪽 타원형 */}
        <div className="absolute w-[275px] h-[361px] left-[410px] top-[223px] bg-[#F2FBFF] rounded-full" />
        {/* 오른쪽 원형 */}
        <div className="absolute w-[664px] h-[662px] left-[917px] top-[74px] bg-[rgba(113,113,113,0.15)] rounded-full" />
        {/* 오른쪽 타원형 */}
        <div className="absolute w-[262px] h-[361px] left-[964px] top-[223px] bg-[#F2FBFF] rounded-full" />
        {/* 회전된 사각형 */}
        <div className="absolute w-[873px] h-[503px] left-[579px] top-[530px] bg-[rgba(113,113,113,0.15)] transform rotate-[-6.11deg]" />
      </div>

      {/* 좌측 상단: 이전 버튼 */}
      <button
        onClick={onBack}
        className="absolute flex items-center justify-center gap-[10px] bg-[#212121] rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-[#3A3A3A]"
        style={{
          width: '167px',
          height: '80px',
          padding: '20px 35px',
          left: '56px',
          top: '40px',
          zIndex: 10,
        }}
      >
        <img
          src="/Frame 1171275969.png"
          alt="back icon"
          style={{ width: '28px', height: '28px', flexShrink: 0 }}
        />
        <span
          className="font-['NanumSquareRound'] font-bold text-white"
          style={{ fontSize: '32px', lineHeight: '36px' }}
        >
          이전
        </span>
      </button>

      {/* 우측 상단: 문장 버튼 */}
      <button
        className="absolute flex items-center justify-center gap-[10px] bg-[#FE6433] rounded-[100px] transition-all hover:bg-[#FF7544]"
        style={{
          width: '167px',
          height: '80px',
          padding: '20px 35px',
          right: '56px',
          top: '40px',
          zIndex: 10,
        }}
      >
        <img
          src="/Vector.png"
          alt="sentence icon"
          style={{ width: '28px', height: '28px', flexShrink: 0 }}
        />
        <span
          className="font-['NanumSquareRound'] font-bold text-white"
          style={{ fontSize: '32px', lineHeight: '36px' }}
        >
          문장
        </span>
      </button>

      {/* 중앙 상단: 제목 */}
      {title && (
        <div
          className="absolute left-1/2 -translate-x-1/2 font-['NanumSquareRound'] font-bold text-black text-center"
          style={{
            top: '55px',
            fontSize: '32px',
            lineHeight: '36px',
            zIndex: 10,
          }}
        >
          {title}
        </div>
      )}

      {/* 메인 컨텐츠 영역 */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        {children}
      </div>

      {/* 하단 텍스트 출력 영역 */}
      <div
        className="absolute flex flex-col justify-center bg-white backdrop-blur-[15px]"
        style={{
          left: buttonContainerLeft ? `${buttonContainerLeft}px` : '50%',
          bottom: '50px',
          transform: buttonContainerLeft ? 'none' : 'translateX(-50%)',
          width: buttonContainerWidth ? `${buttonContainerWidth}px` : 'calc(100% - 112px)',
          maxWidth: buttonContainerWidth ? `${buttonContainerWidth}px` : '1260px',
          height: '140px',
          padding: '20px 50px',
          borderRadius: '32px',
          zIndex: 10,
        }}
      >
        {/* 상단: Group 아이콘 + 텍스트 */}
        <div className="flex flex-row items-center gap-[28px]">
          {/* Group.png 아이콘 */}
          <img
            src="/Group.png"
            alt="speech icon"
            style={{ width: '53px', height: '53px', flexShrink: 0 }}
          />
          {/* 텍스트 */}
          <span
            className="font-['NanumSquareRound'] font-bold"
            style={{
              fontSize: '48px',
              lineHeight: '54px',
              letterSpacing: '0.01em',
              color: outputText === '문장을 생성하는 중입니다...' || !outputText ? '#A1A1A1' : '#1A1A1A'
            }}
          >
            {outputText || '문장이 여기에 표시됩니다'}
          </span>
        </div>

        {/* 하단: Line 82.png */}
        <div className="w-full mt-[15px]">
          <img
            src="/Line 82.png"
            alt="line"
            style={{ width: '100%', height: 'auto', opacity: 0.15 }}
          />
        </div>
      </div>
    </div>
  );
}
