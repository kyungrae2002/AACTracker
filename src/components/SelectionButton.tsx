'use client';

import React, { forwardRef } from 'react';

export interface SelectionButtonProps {
  id: string;
  label: string;
  progress: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isDesktop?: boolean;
  customWidth?: number;
  isNextButton?: boolean;
  isSelected?: boolean;
}

const SelectionButton = forwardRef<HTMLButtonElement, SelectionButtonProps>(
  ({ id, label, onClick, onMouseEnter, onMouseLeave, customWidth, isNextButton = false, isSelected = false }, ref) => {

    // customWidth가 있으면 사용, 없으면 기본값 사용
    const buttonWidth = customWidth ? `${customWidth}px` : '240px';
    const buttonHeight = '400px';

    // 박스 너비에 비례하여 폰트 크기 계산
    const actualWidth = customWidth || 240;
    const horizontalPadding = 54 * 2; // 좌우 padding 합계
    const availableWidth = actualWidth - horizontalPadding; // 실제 텍스트 사용 가능한 너비
    
    // 텍스트 길이
    const textLength = label.length;
    
    // 한글은 대략 1em(폰트 크기)의 너비를 차지
    // availableWidth를 텍스트 길이로 나누면 글자당 사용 가능한 너비
    const maxFontSizeByWidth = availableWidth / textLength;
    
    // 박스 크기 기반 최대 폰트 크기 (원래 로직)
    const baseFontSize = availableWidth * 0.35;
    
    // 두 값 중 작은 값을 사용하여 텍스트가 절대 넘치지 않도록 함
    const calculatedFontSize = Math.min(maxFontSizeByWidth * 0.9, baseFontSize);
    
    // 최소/최대 폰트 크기 제한
    const minFontSize = 20;
    const maxFontSize = 120;
    const finalFontSize = Math.max(minFontSize, Math.min(maxFontSize, calculatedFontSize));

    const fontSize = `${finalFontSize}px`;
    const lineHeight = `${finalFontSize * 1.14}px`;

    // 선택 상태에 따른 스타일
    const getButtonStyle = () => {
      if (isSelected) {
        return {
          background: 'linear-gradient(0deg, rgba(165, 232, 190, 0.8), rgba(165, 232, 190, 0.8)), rgba(255, 255, 255, 0.09)',
          borderColor: '#A5E8BE',
        };
      }
      return {
        background: 'linear-gradient(0deg, #FFFFFF, #FFFFFF), rgba(255, 255, 255, 0.09)',
        borderColor: '#E7E7E7',
      };
    };

    const buttonStyle = getButtonStyle();

    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="flex flex-row justify-center items-center rounded-[20px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] backdrop-blur-[15px] transition-all duration-200"
        style={{
          width: buttonWidth,
          height: buttonHeight,
          padding: '30px 54px',
          background: buttonStyle.background,
          border: `6px solid ${buttonStyle.borderColor}`,
          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {isNextButton ? (
          // 다시 버튼 (reset.png 아이콘)
          <div className="flex items-center justify-center" style={{ width: '136px', height: '136px' }}>
            <img
              src="/reset.png"
              alt="reset icon"
              style={{ width: '136px', height: '136px', objectFit: 'contain' }}
            />
          </div>
        ) : (
          // 일반 버튼 (텍스트)
          <span className="font-['NanumSquareRound'] font-bold text-black"
                style={{
                  fontSize: fontSize,
                  lineHeight: lineHeight,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap'
                }}>
            {label}
          </span>
        )}
      </button>
    );
  }
);

SelectionButton.displayName = 'SelectionButton';

export default SelectionButton;