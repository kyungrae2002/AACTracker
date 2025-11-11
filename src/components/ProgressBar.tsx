'use client';

import React from 'react';
import type { SelectionStep } from '@/app/page';

export interface ProgressBarProps {
  currentStep: SelectionStep;
  currentPage?: number;
  isCompleted?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, currentPage = 0, isCompleted = false }) => {
  // 단계별 진행률 계산 (4단계: 상황, 핵심 단어, 서술어, 완료)
  const getProgress = () => {
    // 문장이 완성되었으면 100%
    if (isCompleted) {
      return 100;
    }

    switch (currentStep) {
      case 'category':
        return 0;
      case 'coreWord':
        return 33.33;
      case 'predicate':
        return 66.66;
      default:
        return 0;
    }
  };

  const progress = getProgress();

  // 노드 위치 계산 (0%, 33.33%, 66.66%, 100%)
  const nodePositions = [0, 33.33, 66.66, 100];
  const nodeLabels = ['상황', '핵심 단어', '서술어', '완료'];

  return (
    <div className="fixed left-0 right-0 z-40" style={{ top: '150px', paddingLeft: '56px', paddingRight: '56px', paddingBottom: '50px' }}>
      {/* 진행 상황 바 배경 */}
      <div
        className="relative w-full bg-gray-200"
        style={{
          height: '8px',
        }}
      >
        {/* 진행 상황 바 (애니메이션 포함) */}
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #FE6433 0%, #FF8C66 100%)',
            boxShadow: '0 2px 8px rgba(254, 100, 51, 0.4)',
          }}
        />

        {/* 노드들 - 정류장 스타일 */}
        {nodePositions.map((position, index) => {
          const isActive = progress >= position;
          return (
            <div
              key={index}
              className="absolute flex flex-col items-center"
              style={{
                left: `${position}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 정류장 기둥 (세로선) */}
              <div
                className="transition-all duration-500"
                style={{
                  width: '3px',
                  height: '20px',
                  backgroundColor: isActive ? '#FE6433' : '#CCCCCC',
                  marginBottom: '3px',
                }}
              />

              {/* 원형 노드 (틱 제거) */}
              <div
                className="rounded-full transition-all duration-500"
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: isActive ? '#FE6433' : '#E7E7E7',
                  border: `2px solid ${isActive ? '#FE6433' : '#CCCCCC'}`,
                  boxShadow: isActive ? '0 3px 8px rgba(254, 100, 51, 0.4)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              />

              {/* 라벨 */}
              <span
                className="font-['NanumSquareRound'] font-extrabold mt-1 whitespace-nowrap"
                style={{
                  fontSize: '14px',
                  color: isActive ? '#FE6433' : '#999999',
                  letterSpacing: '0.02em',
                }}
              >
                {nodeLabels[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
