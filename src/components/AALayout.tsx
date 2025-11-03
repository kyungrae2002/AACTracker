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
  const { buttonHeight, buttonFontSize, sideButtonWidth } = STYLES.common;

  return (
    <div className="relative w-screen h-screen bg-[#EDF8FC] overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute w-[400px] h-[400px] left-[10%] top-[15%] bg-[#C6EEFF] rounded-full blur-3xl" />
        <div className="absolute w-[300px] h-[300px] right-[15%] top-[20%] bg-[#C6EEFF] rounded-full blur-3xl" />
        <div className="absolute w-[350px] h-[350px] left-[20%] bottom-[10%] bg-[#F2FBFF] rounded-full blur-3xl" />
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

          {/* 우측: 이모티콘/문장 */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                className="flex items-center justify-center bg-[#FE6433] rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-[#FF7544]"
                style={{
                  width: sideButtonWidth,
                  height: buttonHeight,
                  padding: '15px 20px',
                }}
              >
                <span
                  className="font-['NanumSquareRound'] font-bold text-white"
                  style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
                >
                  이모티콘
                </span>
              </button>
              <button
                className="flex items-center justify-center bg-white rounded-[100px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] transition-all hover:bg-gray-50"
                style={{
                  width: sideButtonWidth,
                  height: buttonHeight,
                  padding: '15px 20px',
                  border: '2px solid #D9E4E8',
                }}
              >
                <span
                  className="font-['NanumSquareRound'] font-bold text-black"
                  style={{ fontSize: buttonFontSize, lineHeight: '30px' }}
                >
                  문장
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
        className="absolute flex items-center justify-center rounded-[30px] bg-white shadow-[0px_5px_10px_rgba(0,0,0,0.15)] backdrop-blur-[15px]"
        style={{
          left: '56px',
          bottom: '50px',
          right: '56px',
          height: style.outputHeight,
          padding: '30px 34px',
        }}
      >
        <span
          className="font-['NanumBarunpen'] font-bold text-black"
          style={{ fontSize: style.outputFontSize, lineHeight: style.outputFontSize }}
        >
          {outputText || '문장이 여기에 표시됩니다'}
        </span>
      </div>
    </div>
  );
}
