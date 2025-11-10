'use client';

import React from 'react';

interface AALayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  outputText?: string;
  isDesktop?: boolean;
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
}: AALayoutProps) {
  const style = isDesktop ? STYLES.desktop : STYLES.mobile;
  const { buttonHeight, buttonFontSize } = STYLES.common;

  return (
    <div className="relative w-screen h-screen bg-[#FFF2DB] overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
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

      {/* 상단 영역 */}
      <div className="absolute left-[56px] right-[56px] top-[40px] z-10">
        <div className="flex items-start justify-between">
          {/* 좌측: 뒤로가기 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onBack}
              className="flex items-center justify-center bg-[#5A5A5A] rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-[#6A6A6A]"
              style={{
                width: style.backButtonWidth,
                height: buttonHeight,
                padding: '15px 25px',
              }}
            >
              <span
                className="font-['NanumSquareRound'] font-bold text-white"
                style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
              >
                뒤로가기
              </span>
            </button>
          </div>

          {/* 중앙: 제목 */}
          <h1
            className="font-['NanumSquareRound'] font-bold text-black"
            style={{
              fontSize: style.titleFontSize,
              lineHeight: style.titleFontSize,
              marginTop: '15px',
            }}
          >
            {title}
          </h1>

          {/* 우측: 문장/설정 */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                className="flex items-center justify-center gap-[10px] bg-[#FE6433] rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-[#FF7544]"
                style={{
                  width: '167px',
                  height: '80px',
                  padding: '20px 35px',
                }}
              >
                <div className="w-[28px] h-[28px] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 14C7 14 10 8 14 8C18 8 21 14 21 14C21 14 18 20 14 20C10 20 7 14 7 14Z"
                          fill="white" stroke="white" strokeWidth="1.5"/>
                    <circle cx="14" cy="14" r="3" fill="white"/>
                  </svg>
                </div>
                <span
                  className="font-['NanumSquareRound'] font-bold text-white"
                  style={{ fontSize: '32px', lineHeight: '36px' }}
                >
                  문장
                </span>
              </button>
              <button
                className="flex items-center justify-center gap-[10px] bg-[#212121] rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-[#3A3A3A]"
                style={{
                  width: '167px',
                  height: '80px',
                  padding: '20px 35px',
                }}
              >
                <div className="w-[28px] h-[28px] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="11" stroke="white" strokeWidth="1.5" fill="none"/>
                    <circle cx="14" cy="14" r="6" fill="white"/>
                  </svg>
                </div>
                <span
                  className="font-['NanumSquareRound'] font-bold text-white"
                  style={{ fontSize: '32px', lineHeight: '36px' }}
                >
                  설정
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      {children}

      {/* 하단 텍스트 출력 영역 */}
      <div
        className="absolute flex items-center bg-white backdrop-blur-[15px]"
        style={{
          left: '50%',
          bottom: '50px',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 112px)',
          maxWidth: '1260px',
          height: '200px',
          padding: '30px 82px',
          gap: '25px',
          borderRadius: '32px',
        }}
      >
        <div className="flex flex-col justify-center items-start gap-[34px] w-[1096px] h-[78px]">
          <div className="flex flex-row justify-center items-center gap-[28px] w-[442px] h-[54px]">
            {/* 아이콘 */}
            <div className="w-[53px] h-[53px]">
              <svg width="53" height="53" viewBox="0 0 53 53" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.25 26.5C13.25 26.5 19.875 15.875 26.5 15.875C33.125 15.875 39.75 26.5 39.75 26.5C39.75 26.5 33.125 37.125 26.5 37.125C19.875 37.125 13.25 26.5 13.25 26.5Z"
                      fill="#FE6433" stroke="#FE6433" strokeWidth="2"/>
                <circle cx="26.5" cy="26.5" r="5.5" fill="#FE6433"/>
              </svg>
            </div>
            {/* 텍스트 */}
            <span
              className="font-['NanumSquareRound'] font-bold text-[#1A1A1A]"
              style={{ fontSize: '48px', lineHeight: '54px', letterSpacing: '0.01em' }}
            >
              {outputText || '문장이 여기에 표시됩니다'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
