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
  ({ id, label, onClick, onMouseEnter, onMouseLeave, isDesktop = false, customWidth, isNextButton = false, isSelected = false }, ref) => {

    // customWidth가 있으면 사용, 없으면 기본값 사용
    const buttonWidth = customWidth ? `${customWidth}px` : (isDesktop ? '480px' : '320px');
    const buttonHeight = isDesktop ? '380px' : '360px';
    const fontSize = isDesktop ? '85px' : '65px';
    const lineHeight = isDesktop ? '100px' : '78px';

    // 선택 상태에 따른 스타일
    const getButtonStyle = () => {
      if (isSelected) {
        return {
          backgroundColor: 'rgba(254, 100, 51, 0.63)',
          borderColor: '#FE6433',
        };
      }
      return {
        backgroundColor: 'white',
        borderColor: '#D9E4E8',
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
        className="flex flex-row justify-center items-center rounded-[30px] shadow-[0px_5px_10px_rgba(0,0,0,0.15)] backdrop-blur-[15px] transition-all duration-200"
        style={{
          width: buttonWidth,
          height: buttonHeight,
          padding: '30px 50px',
          backgroundColor: buttonStyle.backgroundColor,
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
