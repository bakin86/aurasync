import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import api from "../../api/axios.js";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#a855f7,#7c3aed)",
  "linear-gradient(135deg,#3b82f6,#6366f1)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#16a34a,#4ade80)",
];

const STATUSES = [
  { key:"online",  label:"Online",  dot:"#22c55e", bg:"rgba(34,197,94,0.12)",  bd:"rgba(34,197,94,0.3)" },
  { key:"away",    label:"Away",    dot:"#f59e0b", bg:"rgba(245,158,11,0.12)", bd:"rgba(245,158,11,0.3)" },
  { key:"busy",    label:"Busy",    dot:"#ef4444", bg:"rgba(239,68,68,0.12)",  bd:"rgba(239,68,68,0.3)" },
  { key:"offline", label:"Offline", dot:"#6B7399", bg:"rgba(107,115,153,0.1)", bd:"rgba(107,115,153,0.25)" },
];

const COVERS = [
  { id:"navy",   v:"linear-gradient(135deg,#080B2A,#1B3066,#2a4080)" },
  { id:"slate",  v:"linear-gradient(135deg,#1B3066,#6B7399,#b8bdd8)" },
  { id:"violet", v:"linear-gradient(135deg,#4c1d95,#7c3aed,#a855f7)" },
  { id:"ocean",  v:"linear-gradient(135deg,#0c4a6e,#0ea5e9,#38bdf8)" },
  { id:"forest", v:"linear-gradient(135deg,#14532d,#16a34a,#4ade80)" },
  { id:"fire",   v:"linear-gradient(135deg,#7c2d12,#f97316,#fbbf24)" },
  { id:"rose",   v:"linear-gradient(135deg,#881337,#f43f5e,#fb7185)" },
  { id:"aurora", v:"linear-gradient(135deg,#1B3066,#6B7399,#f0abfc)" },
];

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

const UserProfilePopup = ({ user: initialUser, position, onClose }) => {
  const { user: currentUser, profile } = useAuth();
  const { onlineUsers } = useSocket();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const popupRef = useRef(null);

  const isDark = theme === "dark";
  const isOwnProfile = currentUser?.id === initialUser?.id;

  // Өөрийн профайл бол currentUser + profile-аас шууд авах — edit хийхэд автоматаар шинэчлэгдэнэ
  const displayName   = isOwnProfile ? currentUser?.username : initialUser?.username;
  const ownStatus     = profile?.status || "online";
  const stObj         = STATUSES.find(s => s.key === ownStatus) || STATUSES[0];
  const bio           = isOwnProfile ? (profile?.bio || "") : "";
  const coverId       = profile?.coverId || "navy";
  const cover         = COVERS.find(c => c.id === coverId)?.v || COVERS[0].v;

  const [user, setUser]                 = useState(isOwnProfile ? currentUser : initialUser);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [visible, setVisible]           = useState(false);

  // currentUser болон profile өөрчлөгдөхөд popup шинэчлэх
  useEffect(() => {
    if (isOwnProfile) setUser({ ...currentUser });
  }, [currentUser?.username, currentUser?.avatar, profile?.status, profile?.bio, profile?.coverId, isOwnProfile]);

  const isOnline = isOwnProfile
    ? (ownStatus !== "offline")
    : onlineUsers.includes(user?.id);

  const avatarSrc  = isOwnProfile
    ? (currentUser?.avatar ? (currentUser.avatar.startsWith("http") ? currentUser.avatar : API_BASE + currentUser.avatar) : null)
    : (user?.avatar ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar) : null);

  const avatarGrad = AVATAR_GRADIENTS[((isOwnProfile ? currentUser?.username : user?.username)?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

  const P = {
    card:    isDark ? "#080b28"  : "#ffffff",
    card2:   isDark ? "#0c0f32"  : "#f4f4fb",
    border:  isDark ? "#151d4a"  : "#c8c8dc",
    border2: isDark ? "#1e2d6a"  : "#b0b0cc",
    text:    isDark ? "#F0F0F5"  : "#04061a",
    text2:   isDark ? "#b8bdd8"  : "#151d4a",
    muted:   isDark ? "#6B7399"  : "#6B7399",
    shadow:  isDark ? "0 32px 80px rgba(8,11,42,.8), 0 0 0 1px rgba(27,48,102,.4)" : "0 8px 48px rgba(8,11,42,.15)",
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("mn-MN");
  };

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Offline";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 5)  return "Offline";
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

  const handleOpenProfile = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("open-profile"));
    onClose();
  };

  const POPUP_W = 320;
  const POPUP_H = isOwnProfile ? 300 : 400;
  const top  = Math.max(60, Math.min((position?.y || 200) - 30, window.innerHeight - POPUP_H - 20));
  const left = Math.min((position?.x || 200) + 16, window.innerWidth - POPUP_W - 16);

  return (
    <div ref={popupRef} style={{
      position: "fixed", zIndex: 500, top, left, width: POPUP_W,
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(8px)",
      transition: "opacity .18s ease, transform .18s cubic-bezier(0.22,1,0.36,1)",
      borderRadius: 24, overflow: "hidden",
      boxShadow: P.shadow,
      background: P.card,
      border: `1px solid ${P.border}`,
    }}>

      {/* Cover */}
      <div style={{
        height: 90,
        background: isOwnProfile ? cover : "linear-gradient(135deg,#080B2A,#1B3066,#2a4080)",
        backgroundImage: "radial-gradient(circle, rgba(240,240,245,0.15) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 10,
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(0,0,0,.35)", border: "none",
          color: "#b8bdd8", fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {isOwnProfile && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={handleOpenProfile}
            style={{
              position: "absolute", bottom: 10, right: 14,
              padding: "6px 14px", borderRadius: 20,
              background: isDark ? "#F0F0F5" : "#04061a",
              border: "none",
              color: isDark ? "#04061a" : "#F0F0F5",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 2px 12px rgba(0,0,0,.3)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
            Засах
          </button>
        )}

        {/* Avatar */}
        <div style={{ position: "absolute", left: 18, bottom: -32 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: `4px solid ${P.card}`,
              background: avatarSrc ? "transparent" : avatarGrad,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 2px ${P.border}`,
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>{displayName?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span style={{
              position: "absolute", bottom: 4, right: 2,
              width: 14, height: 14, borderRadius: "50%",
              background: isOwnProfile ? stObj.dot : (isOnline ? "#22c55e" : "#6b7280"),
              border: `3px solid ${P.card}`,
            }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "44px 18px 18px" }}>
        {/* Name & status */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: P.text }}>{displayName}</span>
            {isOwnProfile ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                background: stObj.bg, border: `1px solid ${stObj.bd}`, color: stObj.dot,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: stObj.dot }} />
                {stObj.label}
              </span>
            ) : (
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: isOnline ? "rgba(34,197,94,.12)" : "rgba(107,114,128,.12)",
                color: isOnline ? "#4ade80" : "#9ca3af",
                border: `1px solid ${isOnline ? "rgba(34,197,94,.3)" : "rgba(107,114,128,.2)"}`,
              }}>
                {isOnline ? "● Online" : `⚫ ${formatLastSeen(user?.lastSeen)}`}
              </span>
            )}
          </div>
          {bio && (
            <p style={{ fontSize: 12, color: P.text2, marginTop: 4, lineHeight: 1.6 }}>{bio}</p>
          )}
        </div>

        {/* Account info card */}
        <div style={{
          background: P.card2, border: `1px solid ${P.border}`,
          borderRadius: 14, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: P.muted, marginBottom: 10 }}>
            ДАНСНЫ МЭДЭЭЛЭЛ
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: P.muted }}>Бүртгүүлсэн</span>
            <span style={{ fontSize: 13, color: P.text2, fontWeight: 600 }}>
              {formatDate(isOwnProfile ? currentUser?.createdAt : user?.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isOwnProfile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {friendStatus === "friends" ? (
              <button disabled style={{ width: "100%", padding: "10px", borderRadius: 12, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "default" }}>✅ Найзууд</button>
            ) : friendStatus === "pending" ? (
              <button disabled style={{ width: "100%", padding: "10px", borderRadius: 12, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", color: "#fbbf24", fontSize: 13, fontWeight: 700, cursor: "default" }}>⏳ Хүсэлт илгээсэн</button>
            ) : (
              <button
                onClick={handleAddFriend} disabled={loading}
                style={{ width: "100%", padding: "10px", borderRadius: 12, background: isDark ? "rgba(27,48,102,.5)" : "rgba(27,48,102,.1)", border: `1px solid ${P.border2}`, color: P.text2, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1B3066"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(27,48,102,.5)" : "rgba(27,48,102,.1)"; e.currentTarget.style.color = P.text2; }}
              >👥 Найз болох</button>
            )}

            <button
              onClick={handleBlock} disabled={loading}
              style={{ width: "100%", padding: "10px", borderRadius: 12, background: isBlocked ? "rgba(239,68,68,.12)" : "transparent", border: `1px solid ${isBlocked ? "rgba(239,68,68,.3)" : P.border}`, color: isBlocked ? "#f87171" : P.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
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
