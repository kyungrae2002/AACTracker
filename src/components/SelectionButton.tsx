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
  customWidth?: number; // 동적 너비 추가
}

const SelectionButton = forwardRef<HTMLButtonElement, SelectionButtonProps>(
  ({ id, label, progress, onClick, onMouseEnter, onMouseLeave, isDesktop = false, customWidth }, ref) => {
    // customWidth가 있으면 사용, 없으면 기본값 사용
    const buttonWidth = customWidth ? `${customWidth}px` : (isDesktop ? '480px' : '320px');
    const buttonHeight = isDesktop ? '380px' : '360px';  // 높이 감소
    const fontSize = isDesktop ? '85px' : '65px';
    const lineHeight = isDesktop ? '100px' : '78px';

    const getButtonStyle = () => {
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
        className="flex items-center justify-center rounded-[30px] transition-colors duration-100"
        style={{
          width: buttonWidth,
          height: buttonHeight,
          padding: '30px 50px',
          border: '3px solid #FFDE4C',
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