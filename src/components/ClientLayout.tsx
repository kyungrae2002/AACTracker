'use client';

import React from 'react';
import IrisTracker from '@/components/IrisTracker';
import { IrisTrackerProvider, useIrisTracker } from '@/contexts/IrisTrackerContext';

interface ClientLayoutProps {
  children: React.ReactNode;
}

// IrisTracker를 Context와 연결하는 래퍼 컴포넌트
const IrisTrackerWrapper: React.FC = () => {
  const { handlersRef } = useIrisTracker();

  return (
    <IrisTracker
      onLongBlink={() => {
        console.log('🎯 ClientLayout: onLongBlink triggered');
        handlersRef.current.onLongBlink?.();
      }}
      onDoubleBlink={() => {
        console.log('🎯 ClientLayout: onDoubleBlink triggered');
        handlersRef.current.onDoubleBlink?.();
      }}
      onZoneChange={(direction) => {
        console.log('🎯 ClientLayout: onZoneChange triggered:', direction);
        handlersRef.current.onZoneChange?.(direction);
      }}
    />
  );
};

// 전체 앱을 감싸는 Client Layout
export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <IrisTrackerProvider>
      <IrisTrackerWrapper />
      {children}
    </IrisTrackerProvider>
  );
}
