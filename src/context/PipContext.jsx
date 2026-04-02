import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

const PipContext = createContext(null);

export const PipProvider = ({ children }) => {
  const [pipActive, setPipActive] = useState(false);
  const [pipPos,    setPipPos]    = useState({ x: 16, y: 80 });
  const [tick,      setTick]      = useState(0); // force re-render

  // All call data stored in a single ref — never goes stale on navigate
  const live = useRef({
    localStream:    null,
    isMuted:        false,
    isCameraOff:    false,
    onLeave:        null,
    onToggleMute:   null,
    onToggleCamera: null,
  });

  const bump = useCallback(() => setTick(t => t + 1), []);

  const showPip = useCallback((state) => {
    Object.assign(live.current, state);
    setPipActive(true);
    bump();
  }, [bump]);

  const hidePip = useCallback(() => {
    setPipActive(false);
    bump();
  }, [bump]);

  const updateCallState = useCallback((partial) => {
    Object.assign(live.current, partial);
    bump();
  }, [bump]);

  const getLive = useCallback(() => live.current, []);

  return (
    <PipContext.Provider value={{
      pipActive, pipPos, setPipPos,
      tick,         // GlobalPip watches this to re-render
      getLive,      // always returns latest ref data
      showPip, hidePip, updateCallState,
    }}>
      {children}
    </PipContext.Provider>
  );
};

export const usePip = () => useContext(PipContext);
