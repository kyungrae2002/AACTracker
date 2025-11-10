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
    const fontSize = '64px';
    const lineHeight = '73px';

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
          // 다시 버튼 (화살표 아이콘)
          <div className="flex items-center justify-center" style={{ width: '136px', height: '136px' }}>
            <svg width="136" height="136" viewBox="0 0 136 136" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M85 45.3333L45.3333 85M45.3333 85L45.3333 51.6667M45.3333 85L78.6667 85"
                    stroke="black"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          // 일반 버튼 (텍스트)
          <span className="font-['NanumSquareRound'] font-bold text-black"
                style={{
                  fontSize: fontSize,
                  lineHeight: lineHeight,
                  letterSpacing: '0.01em'
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
