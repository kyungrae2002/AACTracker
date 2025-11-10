'use client';

import React from 'react';

interface CompletionModalProps {
  isVisible: boolean;
  sentence: string;
}

export default function CompletionModal({ isVisible, sentence }: CompletionModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-[32px] shadow-[0px_10px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-10"
        style={{
          width: '1000px',
          padding: '60px',
        }}
      >
        {/* 완성된 문장 박스 */}
        <div
          className="w-full bg-[#FFF2DB] rounded-[20px] flex flex-row items-center gap-[28px]"
          style={{
            padding: '30px 40px',
            border: '4px solid #FE6433',
          }}
        >
          {/* Group.png 아이콘 */}
          <img
            src="/Group.png"
            alt="speech icon"
            style={{ width: '53px', height: '53px', flexShrink: 0 }}
          />
          {/* 완성된 문장 텍스트 */}
          <span
            className="font-['NanumSquareRound'] font-bold text-[#1A1A1A]"
            style={{ fontSize: '48px', lineHeight: '54px', letterSpacing: '0.01em' }}
          >
            {sentence}
          </span>
        </div>

        {/* 안내 메시지 */}
        <div className="flex flex-col items-center gap-3">
          <p
            className="font-['NanumSquareRound'] font-bold text-[#212121] text-center"
            style={{ fontSize: '40px', lineHeight: '48px' }}
          >
            눈을 길게 깜-빡 하면
          </p>
          <p
            className="font-['NanumSquareRound'] font-bold text-[#FE6433] text-center"
            style={{ fontSize: '40px', lineHeight: '48px' }}
          >
            처음화면으로 돌아갑니다
          </p>
        </div>
      </div>
    </div>
  );
}
