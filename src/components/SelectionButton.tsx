'use client';

import React, { forwardRef } from 'react';

interface SelectionButtonProps {
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
  ({ id, label, progress, onClick, onMouseEnter, onMouseLeave, isDesktop = false, customWidth, isNextButton = false, isSelected = false }, ref) => {
    // customWidth가 있으면 사용, 없으면 기본값 사용
    const buttonWidth = customWidth ? `${customWidth}px` : (isDesktop ? '480px' : '320px');
    const buttonHeight = isDesktop ? '380px' : '360px';  // 높이 감소
    const fontSize = isDesktop ? '85px' : '65px';
    const lineHeight = isDesktop ? '100px' : '78px';

    const getButtonStyle = () => {
      // "다시" 또는 "질문" 버튼일 경우 보라색 테마 적용
      if (isNextButton) {
        if (progress > 0) {
          const opacity = progress / 100;
          return {
            backgroundColor: `rgba(147, 51, 234, ${opacity})`, // 보라색 (purple-600)
            color: progress > 50 ? '#FFFFFF' : '#9333EA',
          };
        }
        return {
          backgroundColor: 'transparent',
          color: '#9333EA', // 보라색
        };
      }

      // 기본 버튼 (노란색 테마)
      if (progress > 0) {
        const opacity = progress / 100;
        return {
          backgroundColor: `rgba(255, 222, 76, ${opacity})`,
          color: progress > 50 ? '#15171A' : '#FFDE4C',
        };
      }
      return {
        backgroundColor: 'transparent',
        color: '#FFDE4C',
      };
    };

    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="flex items-center justify-center rounded-[30px] transition-all duration-200"
        style={{
          width: buttonWidth,
          height: buttonHeight,
          padding: '30px 50px',
          border: isNextButton ? '3px solid #9333EA' : '3px solid #FFDE4C',
          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
          boxShadow: isSelected
            ? (isNextButton ? '0 0 30px rgba(147, 51, 234, 0.8)' : '0 0 30px rgba(255, 222, 76, 0.8)')
            : 'none',
          zIndex: isSelected ? 10 : 1,
          ...getButtonStyle(),
        }}
      >
        <span
          className="font-pretendard font-semibold"
          style={{
            fontSize: fontSize,
            lineHeight: lineHeight,
          }}
        >
          {label}
        </span>
      </button>
    );
  }
);

SelectionButton.displayName = 'SelectionButton';

export default SelectionButton;