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

  const [user, setUser]                 = useState(initialUser);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [visible, setVisible]           = useState(false);

  const isOwnProfile = currentUser?.id === initialUser?.id;
  const isOnline     = onlineUsers.includes(user?.id);
  const statusColor  = isOnline ? "#4ade80" : "#6b7280";

  const avatarSrc  = user?.avatar
    ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar)
    : null;
  const avatarGrad = AVATAR_GRADIENTS[(user?.username?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

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

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" });
  };

  // Өөрийн профайл бол popup хаа
  useEffect(() => {
    if (isOwnProfile) { onClose(); return; }
    requestAnimationFrame(() => setVisible(true));
    api.get(`/auth/user/${initialUser?.id}`).then(r => setUser(r.data.data)).catch(() => {});
    api.get("/friends").then(res => {
      if ((res.data.data || []).find(f => f.id === initialUser?.id)) setFriendStatus("friends");
    }).catch(() => {});
    api.get("/friends/requests").then(res => {
      if ((res.data.data || []).find(r => r.senderId === currentUser?.id)) setFriendStatus("pending");
    }).catch(() => {});
    api.get(`/blocks/check/${initialUser?.id}`).then(res => {
      setIsBlocked(res.data.data.blocked);
    }).catch(() => {});
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

  if (isOwnProfile) return null;

  const POPUP_W = 260;
  const POPUP_H = 320;
  const top  = Math.max(60, Math.min((position?.y || 200) - 30, window.innerHeight - POPUP_H - 20));
  const left = Math.min((position?.x || 200) + 16, window.innerWidth - POPUP_W - 16);

  const Btn = ({ onClick, children, style = {} }) => (
    <button onClick={onClick} style={{
      width: "100%", padding: "9px 12px", borderRadius: 12, border: "none",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      transition: "opacity .15s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  );

  return (
    <div ref={popupRef} style={{
      position: "fixed", zIndex: 500, top, left, width: POPUP_W,
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(8px)",
      transition: "opacity .18s ease, transform .18s cubic-bezier(0.22,1,0.36,1)",
      background: "#0a0e2e",
      border: "1px solid rgba(107,115,153,.3)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(4,6,26,.9), 0 0 0 1px rgba(27,48,102,.4)",
    }}>
      {/* Banner */}
      <div style={{
        height: 70,
        background: "linear-gradient(135deg,#080B2A,#1B3066,#2a4080)",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 8, right: 8,
          width: 24, height: 24, borderRadius: "50%",
          background: "rgba(0,0,0,.4)", border: "none",
          color: "#b8bdd8", fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        {/* Avatar */}
        <div style={{ marginTop: -30, marginBottom: 10 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              border: "3px solid #0a0e2e",
              background: avatarSrc ? "transparent" : avatarGrad,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 2px ${statusColor}66`,
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{user?.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span style={{
              position: "absolute", bottom: 2, right: 2,
              width: 13, height: 13, borderRadius: "50%",
              background: statusColor, border: "2px solid #0a0e2e",
            }} />
          </div>
        </div>

        {/* Info */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#F0F0F5", marginBottom: 2 }}>{user?.username}</div>
          <div style={{ fontSize: 11, color: isOnline ? "#4ade80" : "#6b7280", marginBottom: 4 }}>
            {isOnline ? "● Online" : `⚫ ${formatLastSeen(user?.lastSeen)}`}
          </div>
          {user?.email && (
            <div style={{ fontSize: 11, color: "#4a5180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
          )}
          {user?.createdAt && (
            <div style={{ fontSize: 10, color: "#363d6a", marginTop: 3 }}>
              Нэгдсэн: {formatDate(user.createdAt)}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: "rgba(107,115,153,.15)", marginBottom: 12 }} />

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Btn onClick={() => { navigate(`/dm/${user.id}`); onClose(); }}
            style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff" }}>
            💬 Мессеж илгээх
          </Btn>

          {friendStatus === "friends"
            ? <Btn style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", color: "#4ade80", cursor: "default" }}>✅ Найзууд</Btn>
            : friendStatus === "pending"
            ? <Btn style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", color: "#fbbf24", cursor: "default" }}>⏳ Хүсэлт илгээсэн</Btn>
            : <Btn onClick={handleAddFriend} style={{ background: "rgba(27,48,102,.5)", border: "1px solid #1B3066", color: "#b8bdd8" }}>👥 Найз болох</Btn>
          }

          <Btn onClick={handleBlock} style={{
            background: isBlocked ? "rgba(239,68,68,.12)" : "transparent",
            border: `1px solid ${isBlocked ? "rgba(239,68,68,.3)" : "rgba(107,115,153,.2)"}`,
            color: isBlocked ? "#f87171" : "#6B7399",
          }}>
            {isBlocked ? "🚫 Блок болгосон" : "🚫 Блок"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePopup;
