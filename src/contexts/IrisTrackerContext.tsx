'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

interface IrisTrackerHandlers {
  onLongBlink?: () => void;
  onDoubleBlink?: () => void;
  onZoneChange?: (direction: 'left' | 'right') => void;
  onCenterGaze?: () => void;
}

interface IrisTrackerContextType {
  handlersRef: React.MutableRefObject<IrisTrackerHandlers>;
  registerHandlers: (handlers: IrisTrackerHandlers) => void;
}

const IrisTrackerContext = createContext<IrisTrackerContextType | null>(null);

export const useIrisTracker = () => {
  const context = useContext(IrisTrackerContext);
  if (!context) {
    throw new Error('useIrisTracker must be used within IrisTrackerProvider');
  }
  return context;
};

interface IrisTrackerProviderProps {
  children: React.ReactNode;
}

export const IrisTrackerProvider: React.FC<IrisTrackerProviderProps> = ({ children }) => {
  const handlersRef = useRef<IrisTrackerHandlers>({});

  const registerHandlers = useCallback((handlers: IrisTrackerHandlers) => {
    console.log('📝 Registering handlers:', Object.keys(handlers));
    handlersRef.current = handlers;
  }, []);

  const value = {
    handlersRef,
    registerHandlers,
  };

  return (
    <IrisTrackerContext.Provider value={value}>
      {children}
    </IrisTrackerContext.Provider>
  );
};

// 페이지에서 핸들러를 등록하는 훅
export const useRegisterIrisHandlers = (handlers: IrisTrackerHandlers) => {
  const { registerHandlers } = useIrisTracker();

  useEffect(() => {
    registerHandlers(handlers);
    return () => {
      // 언마운트 시 핸들러 정리
      registerHandlers({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.onLongBlink, handlers.onDoubleBlink, handlers.onZoneChange, handlers.onCenterGaze, registerHandlers]);
};
