import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

// Live updating time string
const useTimeAgo = (date) => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const calc = () => {
      if (!date) return "";
      const s = Math.floor((Date.now() - new Date(date)) / 1000);
      if (s < 5)   return "Яг одоо";
      if (s < 60)  return `${s}с өмнө`;
      if (s < 3600) return `${Math.floor(s/60)}м өмнө`;
      if (s < 86400) return `${Math.floor(s/3600)}ц өмнө`;
      return new Date(date).toLocaleDateString("mn-MN", { month: "short", day: "numeric" });
    };
    setLabel(calc());
    const iv = setInterval(() => setLabel(calc()), 15000);
    return () => clearInterval(iv);
  }, [date]);
  return label;
};

const TYPE_META = {
  dm:              { grad: "linear-gradient(135deg,#1B3066,#2a4080)", accent: "#2a4080",  icon: "fa-solid fa-message",   color: "#60a5fa" },
  channel_message: { grad: "linear-gradient(135deg,#2a4080,#1B3066)", accent: "#1B3066",  icon: "fa-solid fa-message",   color: "#93c5fd" },
  mention:         { grad: "linear-gradient(135deg,#d97706,#b45309)", accent: "#f59e0b",  icon: "fa-solid fa-at",        color: "#fbbf24" },
  reaction:        { grad: "linear-gradient(135deg,#7c3aed,#5b21b6)", accent: "#8b5cf6",  icon: "fa-solid fa-bell",      color: "#c4b5fd" },
  friend_request:  { grad: "linear-gradient(135deg,#6B7399,#1B3066)", accent: "#6B7399",  icon: "fa-solid fa-user-plus", color: "#a5b4fc" },
  friend_accepted: { grad: "linear-gradient(135deg,#16a34a,#15803d)", accent: "#22c55e",  icon: "fa-solid fa-check",     color: "#4ade80" },
  call:            { grad: "linear-gradient(135deg,#22c55e,#16a34a)", accent: "#22c55e",  icon: "fa-solid fa-phone",     color: "#4ade80" },
  missed_call:     { grad: "linear-gradient(135deg,#ef4444,#dc2626)", accent: "#ef4444",  icon: "fa-solid fa-phone",     color: "#f87171" },
  default:         { grad: "linear-gradient(135deg,#1B3066,#080B2A)", accent: "#1B3066",  icon: "fa-solid fa-bell",      color: "#818cf8" },
};

function NotifItem({ n, isDark, onClose }) {
  const navigate = useNavigate();
  const time     = useTimeAgo(n.time);
  const meta     = TYPE_META[n.type] || TYPE_META.default;
  const { icon, grad, accent, color } = meta;

  const P = {
    text:   isDark ? "#F0F0F5" : "#080B2A",
    muted:  isDark ? "#6B7399" : "#8890b5",
    hover:  isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.05)",
    bg:     isDark ? "#0D1035" : "#ffffff",
    unread: isDark ? "rgba(27,48,102,.15)" : "rgba(27,48,102,.04)",
  };

  const avatarSrc = n.avatar
    ? (n.avatar.startsWith("http") ? n.avatar : API_BASE + n.avatar)
    : null;

  const handleClick = () => {
    onClose(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <button onClick={handleClick} style={{
      width: "100%", textAlign: "left",
      padding: "10px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
      background: !n.read ? P.unread : "transparent",
      border: "none", borderBottom: `1px solid ${isDark ? "rgba(27,48,102,.3)" : "rgba(27,48,102,.08)"}`,
      cursor: "pointer", transition: "background .1s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = P.hover}
      onMouseLeave={e => e.currentTarget.style.background = !n.read ? P.unread : "transparent"}
    >
      {/* Avatar or icon */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {avatarSrc
          ? <img src={avatarSrc} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: 38, height: 38, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={icon} style={{ fontSize: 15, color: "#F0F0F5" }}></i>
            </div>
        }
        {/* Type badge */}
        <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: grad, border: `2px solid ${P.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={icon} style={{ fontSize: 8, color: "#fff" }}></i>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: P.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {n.title}
          </p>
          <span style={{ fontSize: 10, color: P.muted, flexShrink: 0, marginTop: 1 }}>{time}</span>
        </div>
        <p style={{ fontSize: 11, color: P.muted, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
          {n.message}
        </p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
      )}
    </button>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const { theme } = useTheme();
  const isDark    = theme === "dark";
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ bottom: 56, left: 270 });
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPopupPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.right + 8,
      });
      markAllRead();
    }
    setOpen(p => !p);
  };

  const handleClose = (id) => { markRead(id); setOpen(false); };

  const P = {
    bg:     isDark ? "#0D1035" : "#ffffff",
    bg2:    isDark ? "#111540" : "#f4f4fb",
    border: isDark ? "#1B3066" : "#c8c8dc",
    text:   isDark ? "#F0F0F5" : "#080B2A",
    muted:  isDark ? "#6B7399" : "#6B7399",
    shadow: isDark ? "0 20px 60px rgba(8,11,42,.85), 0 0 0 1px rgba(27,48,102,.4)" : "0 8px 40px rgba(8,11,42,.15), 0 0 0 1px rgba(27,48,102,.1)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button onClick={handleOpen} style={{
        width: 26, height: 26, borderRadius: 6, border: "none",
        background: open ? "var(--surface2)" : "none",
        cursor: "pointer", color: open ? "var(--text)" : "var(--text5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .15s", position: "relative",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.color = "var(--text5)"; e.currentTarget.style.background = "none"; } }}
      >
        <i className="fa-solid fa-bell" style={{fontSize:13}}></i>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 1, right: 1,
            width: 14, height: 14, borderRadius: "50%",
            background: "linear-gradient(135deg,#1B3066,#6B7399)",
            color: "#F0F0F5", fontSize: 7, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface)",
            animation: "notifPop .3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — rendered via portal to avoid z-index/overflow clipping */}
      {open && createPortal(
        <div style={{
          position: "fixed", bottom: popupPos.bottom, left: popupPos.left,
          width: 320, background: P.bg,
          border: `1px solid ${P.border}`,
          borderRadius: 16, overflow: "hidden",
          boxShadow: P.shadow, zIndex: 9990,
          animation: "fadeUp .2s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderBottom: `1px solid ${P.border}`,
            background: isDark ? "rgba(27,48,102,.12)" : "rgba(27,48,102,.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Мэдэгдлүүд</span>
              {unreadCount > 0 && (
                <span style={{ padding: "1px 7px", borderRadius: 10, background: "linear-gradient(135deg,#1B3066,#2a4080)", color: "#F0F0F5", fontSize: 10, fontWeight: 700 }}>
                  {unreadCount} шинэ
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: P.muted, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                  title="Бүгдийг устгах"
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.1)"; e.currentTarget.style.color = "#f87171"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.muted; }}>
                  <i className="fa-solid fa-trash" style={{fontSize:12}}></i>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <i className="fa-solid fa-bell" style={{fontSize:28}}></i>
                <p style={{ fontSize: 13, fontWeight: 600, color: P.text, margin: "0 0 4px" }}>Мэдэгдэл байхгүй</p>
                <p style={{ fontSize: 11, color: P.muted, margin: 0 }}>Шинэ үйл явдал гарахад энд харагдана</p>
              </div>
            ) : notifications.map(n => (
              <NotifItem key={n.id} n={n} isDark={isDark} onClose={handleClose} />
            ))}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes notifPop { from{transform:scale(0)} to{transform:scale(1)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}
