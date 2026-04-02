import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#a855f7,#7c3aed)",
  "linear-gradient(135deg,#3b82f6,#6366f1)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#16a34a,#4ade80)",
];

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

const UserProfilePopup = ({ user: initialUser, position, onClose }) => {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();
  const popupRef = useRef(null);

  const isOwnProfile = currentUser?.id === initialUser?.id;

  const [user, setUser]                 = useState(isOwnProfile ? currentUser : initialUser);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [visible, setVisible]           = useState(false);

  const isOnline    = isOwnProfile ? true : onlineUsers.includes(user?.id);
  const statusColor = isOnline ? "#4ade80" : "#6b7280";

  const avatarSrc  = user?.avatar
    ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar)
    : null;
  const avatarGrad = AVATAR_GRADIENTS[(user?.username?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("mn-MN", { year: "numeric", month: "numeric", day: "numeric" });
  };

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Offline";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Яг одоо";
    if (mins < 60) return `${mins}м өмнө`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}ц өмнө`;
    return `${Math.floor(hrs / 24)}х өмнө`;
  };

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    if (!isOwnProfile && initialUser?.id) {
      api.get(`/auth/user/${initialUser.id}`).then(r => setUser(r.data.data)).catch(() => {});
      api.get("/friends").then(res => {
        if ((res.data.data || []).find(f => f.id === initialUser.id)) setFriendStatus("friends");
      }).catch(() => {});
      api.get("/friends/requests").then(res => {
        if ((res.data.data || []).find(r => r.senderId === currentUser?.id)) setFriendStatus("pending");
      }).catch(() => {});
      api.get(`/blocks/check/${initialUser.id}`).then(res => {
        setIsBlocked(res.data.data.blocked);
      }).catch(() => {});
    }
  }, [initialUser?.id]);

  useEffect(() => {
    const clickOutside = e => { if (popupRef.current && !popupRef.current.contains(e.target)) onClose(); };
    const esc = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", clickOutside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", clickOutside); document.removeEventListener("keydown", esc); };
  }, []);

  const handleAddFriend = async () => {
    setLoading(true);
    try { await api.post("/friends/request", { username: user.username }); setFriendStatus("pending"); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleBlock = async () => {
    setLoading(true);
    try { const res = await api.post(`/blocks/${user.id}`); setIsBlocked(res.data.data.blocked); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const POPUP_W = 300;
  const POPUP_H = isOwnProfile ? 320 : 380;
  const top  = Math.max(60, Math.min((position?.y || 200) - 30, window.innerHeight - POPUP_H - 20));
  const left = Math.min((position?.x || 200) + 16, window.innerWidth - POPUP_W - 16);

  return (
    <div ref={popupRef} style={{
      position: "fixed", zIndex: 500, top, left, width: POPUP_W,
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(8px)",
      transition: "opacity .18s ease, transform .18s cubic-bezier(0.22,1,0.36,1)",
      background: "#0d1240",
      border: "1px solid rgba(107,115,153,.25)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(4,6,26,.95)",
    }}>

      {/* Banner */}
      <div style={{
        height: 80,
        background: "linear-gradient(135deg,#0f1650,#1B3066,#2a4080)",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        position: "relative",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 10,
          width: 26, height: 26, borderRadius: "50%",
          background: "rgba(0,0,0,.35)", border: "none",
          color: "#b8bdd8", fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Edit button — own profile only */}
        {isOwnProfile && (
          <button
            onClick={() => { window.dispatchEvent(new CustomEvent("open-profile")); onClose(); }}
            style={{
              position: "absolute", bottom: -16, right: 16,
              padding: "6px 14px", borderRadius: 20,
              background: "#fff", border: "none",
              color: "#0d1240", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 2px 12px rgba(0,0,0,.3)",
            }}
          >
            ✎ Засах
          </button>
        )}
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {/* Avatar */}
        <div style={{ marginTop: -28, marginBottom: 12 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              border: "3px solid #0d1240",
              background: avatarSrc ? "transparent" : avatarGrad,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{user?.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span style={{
              position: "absolute", bottom: 3, right: 3,
              width: 14, height: 14, borderRadius: "50%",
              background: statusColor, border: "2px solid #0d1240",
            }} />
          </div>
        </div>

        {/* Name & status */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#F0F0F5" }}>{user?.username}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: isOnline ? "rgba(74,222,128,.15)" : "rgba(107,114,128,.15)",
              color: isOnline ? "#4ade80" : "#9ca3af",
              border: `1px solid ${isOnline ? "rgba(74,222,128,.3)" : "rgba(107,114,128,.2)"}`,
            }}>
              {isOnline ? "● Online" : `⚫ ${formatLastSeen(user?.lastSeen)}`}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div style={{
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(107,115,153,.15)",
          borderRadius: 14, padding: "12px 14px",
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6B7399", marginBottom: 10 }}>
            ДАНСНЫ МЭДЭЭЛЭЛ
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#b8bdd8" }}>Бүртгүүлсэн</span>
            <span style={{ fontSize: 13, color: "#F0F0F5", fontWeight: 600 }}>{formatDate(user?.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        {!isOwnProfile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => { navigate(`/dm/${user.id}`); onClose(); }}
              style={{
                width: "100%", padding: "10px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#a855f7,#6366f1)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", transition: "opacity .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              💬 Мессеж илгээх
            </button>

            {friendStatus === "friends" ? (
              <button disabled style={{ width: "100%", padding: "10px", borderRadius: 12, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "default" }}>
                ✅ Найзууд
              </button>
            ) : friendStatus === "pending" ? (
              <button disabled style={{ width: "100%", padding: "10px", borderRadius: 12, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", color: "#fbbf24", fontSize: 13, fontWeight: 700, cursor: "default" }}>
                ⏳ Хүсэлт илгээсэн
              </button>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={loading}
                style={{ width: "100%", padding: "10px", borderRadius: 12, background: "rgba(27,48,102,.5)", border: "1px solid #1B3066", color: "#b8bdd8", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1B3066"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(27,48,102,.5)"; e.currentTarget.style.color = "#b8bdd8"; }}
              >
                👥 Найз болох
              </button>
            )}

            <button
              onClick={handleBlock}
              disabled={loading}
              style={{
                width: "100%", padding: "10px", borderRadius: 12,
                background: isBlocked ? "rgba(239,68,68,.12)" : "transparent",
                border: `1px solid ${isBlocked ? "rgba(239,68,68,.3)" : "rgba(107,115,153,.2)"}`,
                color: isBlocked ? "#f87171" : "#6B7399",
                fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s",
              }}
            >
              {isBlocked ? "🚫 Блок болгосон" : "🚫 Блок"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePopup;
