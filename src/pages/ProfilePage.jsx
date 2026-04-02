import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../api/axios.js";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#a855f7,#7c3aed)",
  "linear-gradient(135deg,#3b82f6,#6366f1)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#16a34a,#4ade80)",
];

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();

  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;
  const isOnline = onlineUsers.includes(id);

  useEffect(() => {
    setLoading(true);
    api.get(`/auth/search?q=${id}`).catch(() => {})
    // Fetch user by id
    api.get(`/friends`).then(res => {
      const friends = res.data.data || [];
      const found = friends.find(f => f.id === id);
      if (found) { setUser(found); setFriendStatus("friends"); }
    }).catch(() => {});

    // Try to get from search or current user
    if (isOwnProfile) {
      setUser(currentUser);
      setLoading(false);
      return;
    }

    // Get friend/block status
    api.get("/friends").then(res => {
      const friends = res.data.data || [];
      const found = friends.find(f => f.id === id);
      if (found) { setUser(found); setFriendStatus("friends"); }
    }).catch(() => {});

    api.get("/friends/requests").then(res => {
      const reqs = res.data.data || [];
      if (reqs.find(r => r.senderId === currentUser?.id && r.receiverId === id)) {
        setFriendStatus("pending");
      }
    }).catch(() => {});

    api.get(`/blocks/check/${id}`).then(res => {
      setIsBlocked(res.data.data.blocked);
    }).catch(() => {});

    setLoading(false);
  }, [id]);

  const handleAddFriend = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await api.post("/friends/request", { username: user.username });
      setFriendStatus("pending");
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleBlock = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/blocks/${id}`);
      setIsBlocked(res.data.data.blocked);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const avatarSrc = user?.avatar
    ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar)
    : null;

  const gradientIdx = (user?.username?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  const avatarGrad = AVATAR_GRADIENTS[gradientIdx];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#04061a 0%,#080b28 50%,#04061a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "fixed", top: 20, left: 20,
          padding: "8px 16px", borderRadius: 12,
          background: "rgba(27,48,102,.4)", border: "1px solid #1B3066",
          color: "#b8bdd8", fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          zIndex: 10,
        }}
      >
        ← Буцах
      </button>

      <div style={{
        width: "100%", maxWidth: 420,
        background: "#0D1035",
        border: "1px solid #1B3066",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(8,11,42,0.8)",
      }}>
        {/* Banner */}
        <div style={{
          height: 120,
          background: "linear-gradient(135deg,#080B2A,#1B3066,#2a4080)",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />

        {/* Content */}
        <div style={{ padding: "0 24px 24px" }}>
          {/* Avatar */}
          <div style={{ marginTop: -40, marginBottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              border: "4px solid #0D1035",
              background: avatarSrc ? "transparent" : avatarGrad,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 2px ${isOnline ? "#4ade80" : "#6b7280"}55`,
              position: "relative",
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>
                    {user?.username?.[0]?.toUpperCase() || "?"}
                  </span>
              }
              {/* Status dot */}
              <span style={{
                position: "absolute", bottom: 4, right: 4,
                width: 14, height: 14, borderRadius: "50%",
                background: isOnline ? "#4ade80" : "#6b7280",
                border: "2px solid #0D1035",
              }} />
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", margin: 0 }}>
              {user?.username || "Хэрэглэгч"}
            </h1>
            <p style={{ fontSize: 13, color: isOnline ? "#4ade80" : "#6b7280", marginTop: 4 }}>
              {isOnline ? "● Online" : "⚫ Offline"}
            </p>
            {user?.email && (
              <p style={{ fontSize: 12, color: "#6B7399", marginTop: 4 }}>{user.email}</p>
            )}
            {user?.createdAt && (
              <p style={{ fontSize: 11, color: "#4a5180", marginTop: 4 }}>
                Нэгдсэн: {formatDate(user.createdAt)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate(`/dm/${id}`)}
                  style={{
                    width: "100%", padding: "12px",
                    borderRadius: 14, border: "none",
                    background: "linear-gradient(135deg,#a855f7,#6366f1)",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: "pointer", transition: "opacity .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  💬 Мессеж илгээх
                </button>

                {friendStatus === "friends" ? (
                  <button disabled style={{ width: "100%", padding: "12px", borderRadius: 14, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)", color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: "default" }}>
                    ✅ Найзууд
                  </button>
                ) : friendStatus === "pending" ? (
                  <button disabled style={{ width: "100%", padding: "12px", borderRadius: 14, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontSize: 14, fontWeight: 700, cursor: "default" }}>
                    ⏳ Хүсэлт илгээсэн
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    disabled={actionLoading}
                    style={{ width: "100%", padding: "12px", borderRadius: 14, background: "rgba(27,48,102,.4)", border: "1px solid #1B3066", color: "#b8bdd8", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1B3066"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(27,48,102,.4)"; e.currentTarget.style.color = "#b8bdd8"; }}
                  >
                    👥 Найз болох
                  </button>
                )}

                <button
                  onClick={handleBlock}
                  disabled={actionLoading}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 14,
                    background: isBlocked ? "rgba(239,68,68,.15)" : "transparent",
                    border: isBlocked ? "1px solid rgba(239,68,68,.3)" : "1px solid #1B3066",
                    color: isBlocked ? "#f87171" : "#6B7399",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                  }}
                >
                  {isBlocked ? "🚫 Блок болгосон — Арилгах" : "🚫 Блок"}
                </button>
              </>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-profile"))}
                style={{ width: "100%", padding: "12px", borderRadius: 14, background: "rgba(27,48,102,.4)", border: "1px solid #1B3066", color: "#b8bdd8", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                ✏️ Профайл засах
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
