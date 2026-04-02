import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

// Derive socket URL from API URL env var
const API_URL  = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCK_URL = API_URL.replace(/\/api\/?$/, "");  // strip /api suffix

export const SocketProvider = ({ children }) => {
  const { token }                     = useAuth();
  const [socket,      setSocket]      = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!token) { setSocket(null); setOnlineUsers([]); return; }

    console.log("🔌 Connecting socket to:", SOCK_URL);

    const s = io(SOCK_URL, {
      auth: { token },
      reconnection:          true,
      reconnectionAttempts:  10,
      reconnectionDelay:     1000,
      reconnectionDelayMax:  5000,
      timeout:               20000,
    });

    s.on("connect", async () => {
      console.log("✅ Socket connected:", s.id);
      // Join all workspace rooms for notifications
      try {
        const { default: api } = await import("../api/axios.js");
        const res = await api.get("/workspaces");
        (res.data.data || []).forEach(ws => {
          s.emit("join_workspace", ws.id);
        });
      } catch {}
    });
    s.on("connect_error", e  => console.error("❌ Socket error:", e.message));
    s.on("disconnect",    r  => console.log("🔌 Socket disconnected:", r));

    s.on("user_online",  ({ userId }) => setOnlineUsers(p => [...new Set([...p, userId])]));
    s.on("user_offline", ({ userId }) => setOnlineUsers(p => p.filter(id => id !== userId)));

    s.on("kicked_from_workspace", ({ message }) => {
      alert(`Та энэ workspace-аас хасагдлаа.\n${message}`);
      window.location.href = "/dashboard";
    });

    s.on("session_expired", () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    });

    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
