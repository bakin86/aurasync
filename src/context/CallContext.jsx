import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "./SocketContext.jsx";

const CallContext = createContext(null);
const STORAGE_KEY = "aura_incoming_call";

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const [incomingCall, _set] = useState(null);
  const callRef = useRef(null);

  const set = useCallback((data) => {
    callRef.current = data;
    _set(data);
    try {
      if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clear = useCallback(() => {
    callRef.current = null;
    _set(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const get = useCallback(() => {
    if (callRef.current) return callRef.current;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOffer = (data) => {
      const path = window.location.pathname;
      // Only block if ALREADY in an active call with this person
      if (path === `/call/${data.fromUserId}`) return;
      // Show toast/banner everywhere else — including DM page
      set(data);
    };

    const onEnded = () => clear();

    socket.on("dm_call_offer", onOffer);
    socket.on("dm_call_ended", onEnded);
    return () => {
      socket.off("dm_call_offer", onOffer);
      socket.off("dm_call_ended", onEnded);
    };
  }, [socket, set, clear]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      setIncomingCall: set,
      clearIncomingCall: clear,
      getIncomingCall: get,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
