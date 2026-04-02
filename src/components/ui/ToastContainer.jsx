import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { imgUrl } from "../../utils/url.js";

const META = {
  dm:              { grad: "linear-gradient(135deg,#1B3066,#2a4080)", accent: "#2a4080", icon: "fa-solid fa-message" },
  channel_message: { grad: "linear-gradient(135deg,#0f4c8a,#1B3066)", accent: "#3b82f6", icon: "fa-solid fa-message" },
  mention:         { grad: "linear-gradient(135deg,#d97706,#b45309)", accent: "#f59e0b", icon: "fa-solid fa-at"      },
  reaction:        { grad: "linear-gradient(135deg,#7c3aed,#5b21b6)", accent: "#8b5cf6", icon: "fa-solid fa-bell"   },
  friend_request:  { grad: "linear-gradient(135deg,#6B7399,#1B3066)", accent: "#6B7399", icon: "fa-solid fa-user-plus" },
  friend_accepted: { grad: "linear-gradient(135deg,#16a34a,#15803d)", accent: "#22c55e", icon: "fa-solid fa-user-plus" },
  call:            { grad: "linear-gradient(135deg,#22c55e,#16a34a)", accent: "#22c55e", icon: "fa-solid fa-phone"  },
  missed_call:     { grad: "linear-gradient(135deg,#ef4444,#dc2626)", accent: "#ef4444", icon: "fa-solid fa-phone"  },
  default:         { grad: "linear-gradient(135deg,#1B3066,#080B2A)", accent: "#1B3066", icon: "fa-solid fa-bell"   },
};

const fmtTime = () => new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });

// ── Single Toast ──────────────────────────────────────────────────────────
const Toast = ({ toast, onClose, isDark }) => {
  const navigate  = useNavigate();
  const [vis, setVis] = useState(false);
  const timerRef  = useRef(null);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setVis(false);
    setTimeout(() => onClose(toast.id), 320);
  }, [toast.id, onClose]);

  useEffect(() => {
    // Slide in
    const t0 = requestAnimationFrame(() => setVis(true));
    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, 5500);
    return () => { cancelAnimationFrame(t0); clearTimeout(timerRef.current); };
  }, []);

  const pauseTimer  = () => clearTimeout(timerRef.current);
  const resumeTimer = () => { timerRef.current = setTimeout(dismiss, 2500); };

  const handleClick = () => { if (toast.link) navigate(toast.link); dismiss(); };

  const { grad, accent, icon } = META[toast.type] || META.default;
  const avatarSrc = toast.avatar ? imgUrl(toast.avatar) : null;
  const bg   = isDark ? "#0D1035" : "#ffffff";
  const text = isDark ? "#F0F0F5" : "#080B2A";
  const sub  = isDark ? "#b8bdd8" : "#6B7399";

  return (
    <div
      onClick={handleClick}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      style={{
        width: 320, background: bg,
        border: `1px solid ${accent}44`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: isDark
          ? `0 16px 40px rgba(8,11,42,.8), 0 0 0 1px ${accent}22`
          : `0 8px 32px rgba(8,11,42,.12)`,
        cursor: toast.link ? "pointer" : "default",
        transform: vis ? "translateX(0) scale(1)" : "translateX(100%) scale(.95)",
        opacity: vis ? 1 : 0,
        transition: "transform .3s cubic-bezier(0.22,1,0.36,1), opacity .3s ease",
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: grad, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)", animation: "shimmer 2s ease infinite" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 10px 8px" }}>
        {/* Avatar or icon */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 40, height: 40, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={icon} style={{ fontSize: 16, color: "#fff" }}></i>
              </div>
          }
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: grad, border: `2px solid ${bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={icon} style={{ fontSize: 7, color: "#fff" }}></i>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {toast.title}
            </span>
            <span style={{ fontSize: 10, color: sub, flexShrink: 0, marginLeft: 6 }}>{toast.time}</span>
          </div>
          <p style={{ fontSize: 12, color: sub, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
            {toast.message}
          </p>
        </div>

        {/* Close btn */}
        <button onClick={e => { e.stopPropagation(); dismiss(); }} style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: "transparent", border: "none", cursor: "pointer",
          color: sub, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.15)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = sub; }}>
          <i className="fa-solid fa-xmark" style={{fontSize:10}}></i>
        </button>
      </div>

      {/* Progress */}
      <div style={{ height: 2, background: isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)" }}>
        <div style={{ height: "100%", background: accent, animation: "shrink 5.5s linear forwards", transformOrigin: "left" }} />
      </div>
    </div>
  );
};

// ── Container ─────────────────────────────────────────────────────────────
const ToastContainer = () => {
  const { socket }  = useSocket();
  const { user }    = useAuth();
  const { theme }   = useTheme();
  const isDark      = theme === "dark";
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const add    = useCallback((t) => setToasts(p => [...p, { ...t, id: ++counter.current, time: fmtTime() }].slice(-6)), []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  useEffect(() => {
    if (!socket || !user) return;

    // ── DM ───────────────────────────────────────────────────────
    const onDM = (msg) => {
      if (msg.senderId === user.id) return;
      if (msg.isCallLog || msg.type === "call_log") return;
      if (window.location.pathname === `/dm/${msg.senderId}`) return;
      add({
        type: "dm",
        title: msg.sender?.username || "Шинэ мессеж",
        message: msg.content ? (msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content) : "📎 Файл",
        avatar: msg.sender?.avatar,
        link: `/dm/${msg.senderId}`,
      });
    };

    // ── Channel message (workspace-level notification) ────────────
    const onChannel = (msg) => {
      if (msg.user?.id === user.id) return; // ignore own messages
      if (msg.senderId === user.id) return; // ignore if sender
      const path = window.location.pathname;
      if (msg.channelId && path.includes(msg.channelId)) return; // ignore if on that channel
      const isMention = msg.content?.includes(`@${user.username}`);
      add({
        type: isMention ? "mention" : "channel_message",
        title: isMention ? `${msg.user?.username} дурдсан` : msg.user?.username || "Шинэ мессеж",
        message: msg.channelName ? `#${msg.channelName}: ${msg.content?.slice(0,60) || "📎 Файл"}` : msg.content?.slice(0,80) || "📎 Файл",
        avatar: msg.user?.avatar,
        link: msg.channelId ? `/chat/${msg.workspaceId}/${msg.channelId}` : null,
      });
    };

    // ── Reaction ─────────────────────────────────────────────────
    const onReaction = (data) => {
      const { reactorId, reactorName, emoji, messageOwnerId } = data;
      if (!reactorId || reactorId === user.id) return;
      if (!emoji || !reactorName) return;
      // Only notify message owner
      if (messageOwnerId && messageOwnerId !== user.id) return;
      // If no messageOwnerId, skip (avoid false positives)
      if (!messageOwnerId) return;
      add({
        type: "reaction",
        title: reactorName,
        message: `${emoji} таны мессежид реакц нэмлээ`,
        avatar: null,
        link: null,
      });
    };

    // ── Friends ──────────────────────────────────────────────────
    const onFriendReq = (req) => add({
      type: "friend_request",
      title: req.sender?.username || "Найзын хүсэлт",
      message: "Танд найзын хүсэлт илгээлээ",
      avatar: req.sender?.avatar,
      link: "/friends",
    });

    const onFriendAcc = ({ username }) => add({
      type: "friend_accepted",
      title: username,
      message: "Таны найзын хүсэлтийг хүлээн авлаа",
      link: "/friends",
    });

    // Reaction notification from channel or DM
    const onReactionDirect = ({ reactorName, emoji, reactorId }) => {
      if (!reactorName || !emoji) return;
      if (reactorId && reactorId === user.id) return; // ignore own reactions
      add({
        type: "reaction",
        title: reactorName,
        message: `${emoji} реакц нэмлээ`,
        avatar: null,
        link: null,
      });
    };

    socket.on("dm_new_message",          onDM);
    socket.on("channel_notification",    onChannel);
    socket.on("reaction_updated",        onReaction);
    socket.on("reaction_notification",   onReactionDirect);
    socket.on("friend_request_received", onFriendReq);
    socket.on("friend_accepted",         onFriendAcc);

    return () => {
      socket.off("dm_new_message",          onDM);
      socket.off("channel_notification",    onChannel);
      socket.off("reaction_updated",        onReaction);
      socket.off("reaction_notification",   onReactionDirect);
      socket.off("friend_request_received", onFriendReq);
      socket.off("friend_accepted",         onFriendAcc);
    };
  }, [socket, user, add]);

  return (
    <>
      <style>{`
        @keyframes shrink  { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes shimmer { 0%{transform:translateX(-150%)} 100%{transform:translateX(150%)} }
      `}</style>
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none", alignItems: "flex-end",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast toast={t} onClose={remove} isDark={isDark} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastContainer;
