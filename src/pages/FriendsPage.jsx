import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

const Avatar = ({ user, size = 42 }) => {
  const grads = [
    "linear-gradient(135deg,#1B3066,#2a4080)",
    "linear-gradient(135deg,#2a4080,#6B7399)",
    "linear-gradient(135deg,#6B7399,#1B3066)",
    "linear-gradient(135deg,#080B2A,#2a4080)",
  ];
  const g = grads[(user?.username?.charCodeAt(0) || 0) % grads.length];
  const src = user?.avatar ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar) : null;
  if (src) return <img src={src} alt={user.username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: g, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#F0F0F5", fontSize: size * 0.36, fontWeight: 700 }}>
      {user?.username?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

export default function FriendsPage() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [friends,  setFriends]  = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab,      setTab]      = useState("friends");
  const [username, setUsername] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(true);

  const P = {
    bg:       isDark ? "#04061a"  : "#F0F0F5",
    surface:  isDark ? "#080b28"  : "#ffffff",
    surface2: isDark ? "#0c0f32"  : "#f0f0f8",
    border:   isDark ? "#151d4a"  : "#c8c8dc",
    bd2:      isDark ? "#1e2d6a"  : "#b0b0cc",
    text:     isDark ? "#F0F0F5"  : "#04061a",
    text2:    isDark ? "#b8bdd8"  : "#151d4a",
    muted:    isDark ? "#6B7399"  : "#6B7399",
    hoverBg:  isDark ? "rgba(107,115,153,0.13)" : "rgba(27,48,102,0.06)",
    inputBg:  isDark ? "#04061a"  : "#F0F0F5",
    shadow:   isDark ? "0 1px 0 rgba(27,48,102,0.4)" : "0 1px 0 rgba(8,11,42,0.06)",
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!socket) return;
    const onReq = (req) => setRequests(p => [req, ...p]);
    const onAcc = ({ userId, username }) => setFriends(p => [...p, { id: userId, username }]);
    socket.on("friend_request_received", onReq);
    socket.on("friend_accepted", onAcc);
    return () => { socket.off("friend_request_received", onReq); socket.off("friend_accepted", onAcc); };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [fr, rr] = await Promise.all([api.get("/friends"), api.get("/friends/requests")]);
      setFriends(fr.data.data || []);
      setRequests(rr.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      const res = await api.post("/friends/request", { username });
      socket?.emit("friend_request_sent", { toUserId: res.data.data.receiverId, request: res.data.data });
      setSuccess(`@${username} рүү найзын хүсэлт илгээлээ`);
      setUsername("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.message || "Илгээж чадсангүй"); }
  };

  const handleAccept = async (req) => {
    try {
      await api.post(`/friends/accept/${req.id}`);
      setRequests(p => p.filter(r => r.id !== req.id));
      setFriends(p => [...p, req.sender]);
      socket?.emit("friend_request_accepted", { toUserId: req.senderId });
    } catch (e) { console.error(e); }
  };

  const handleUnfriend = async (friendId) => {
    if (!window.confirm("Найзаас хасах уу?")) return;
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends(p => p.filter(f => f.id !== friendId));
    } catch (e) { console.error(e); }
  };

  const handleDecline = async (id) => {
    try {
      await api.post(`/friends/decline/${id}`);
      setRequests(p => p.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const tabBtn = (key, label, count) => ({
    flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all .15s",
    background: tab === key
      ? "linear-gradient(135deg,#1B3066,#2a4080)"
      : "transparent",
    color: tab === key ? "#F0F0F5" : P.muted,
    boxShadow: tab === key ? "0 4px 12px rgba(27,48,102,0.4)" : "none",
  });

  return (
    <div className="friends-page" style={{ minHeight: "100dvh", background: P.bg, color: P.text, transition: "background .25s" }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${P.border}`,
        background: P.surface,
        padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: P.shadow,
        animation: "fadeIn .2s ease both",
      }}>
        <button onClick={() => navigate(-1)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          color: P.muted, fontSize: 13, padding: "5px 10px",
          borderRadius: 8, transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = P.text; e.currentTarget.style.background = P.hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.color = P.muted; e.currentTarget.style.background = "none"; }}>
          <i className="fa-solid fa-arrow-left" style={{fontSize:13}}></i>
          Буцах
        </button>
        <div style={{ width: 1, height: 20, background: P.border }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, color: P.text, margin: 0 }}>Найзууд</h1>
        {requests.length > 0 && (
          <span style={{
            padding: "2px 8px", borderRadius: 20,
            background: "rgba(27,48,102,0.4)", border: `1px solid ${P.bd2}`,
            color: P.text2, fontSize: 11, fontWeight: 600,
          }}>
            {requests.length} хүсэлт
          </span>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px" }}>

        {/* Add friend card */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 16, padding: 20, marginBottom: 24,
          boxShadow: isDark ? "0 4px 20px rgba(8,11,42,0.3)" : "0 2px 12px rgba(8,11,42,0.06)",
          animation: "fadeUp .3s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1B3066,#2a4080)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-user-plus" style={{fontSize:13, color:"#F0F0F5"}}></i>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: 0 }}>Найз нэмэх</p>
              <p style={{ fontSize: 11, color: P.muted, margin: 0 }}>Username-ээр хайж нэмэх</p>
            </div>
          </div>

          {error && (
            <div style={{ margin: "10px 0", padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12, animation: "slideDown .15s ease" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ margin: "10px 0", padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80", fontSize: 12, animation: "slideDown .15s ease" }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              type="text" value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
              placeholder="username"
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10,
                border: `1px solid ${P.bd2}`, background: P.inputBg,
                color: P.text, fontSize: 13, outline: "none",
                fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
              }}
              onFocus={e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; }}
            />
            <button type="submit" style={{
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#1B3066,#2a4080)",
              color: "#F0F0F5", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .15s", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(27,48,102,0.35)",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg,#2a4080,#6B7399)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(107,115,153,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg,#1B3066,#2a4080)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(27,48,102,0.35)"; }}>
              Илгээх
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, padding: 4,
          background: P.surface2, border: `1px solid ${P.border}`,
          borderRadius: 12, marginBottom: 20,
        }}>
          {[["friends", `Найзууд${friends.length > 0 ? ` (${friends.length})` : ""}`],
            ["requests", `Хүсэлт${requests.length > 0 ? ` (${requests.length})` : ""}`]
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={tabBtn(key, label)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <svg style={{ animation: "spinSlow 1.2s linear infinite", color: P.muted }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0110 10"/>
            </svg>
          </div>
        ) : tab === "friends" ? (
          friends.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60, animation: "fadeUp .3s ease both" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: P.text2, marginBottom: 4 }}>Найз байхгүй байна</p>
              <p style={{ fontSize: 13, color: P.muted }}>Дээрх хэсгээс найз нэмэх</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {friends.map((friend, i) => {
                const isOnline = onlineUsers.includes(friend.id);
                return (
                  <div key={friend.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 16px",
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: 14, transition: "all .2s",
                    animation: `fadeUp .3s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s both`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = P.bd2; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = isDark ? "0 6px 20px rgba(8,11,42,0.4)" : "0 4px 16px rgba(8,11,42,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ position: "relative" }}>
                      <Avatar user={friend} size={42} />
                      <span style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 12, height: 12, borderRadius: "50%",
                        background: isOnline ? "#22c55e" : (isDark ? "#3d4670" : "#c8c8dc"),
                        border: `2px solid ${P.surface}`,
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: P.text, margin: 0 }}>{friend.username}</p>
                      <p style={{ fontSize: 11, color: isOnline ? "#22c55e" : P.muted, margin: 0, fontWeight: isOnline ? 500 : 400 }}>
                        {isOnline ? "● Online" : "○ Offline"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => navigate(`/dm/${friend.id}`)} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 10,
                        background: isDark ? "rgba(27,48,102,0.3)" : "rgba(27,48,102,0.08)",
                        border: `1px solid ${P.bd2}`,
                        color: P.text2, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all .15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#151d4a"; e.currentTarget.style.color = "#F0F0F5"; e.currentTarget.style.borderColor = "#1e2d6a"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(27,48,102,0.3)" : "rgba(27,48,102,0.08)"; e.currentTarget.style.color = P.text2; e.currentTarget.style.borderColor = P.bd2; }}>
                        <i className="fa-solid fa-message" style={{fontSize:11}}></i>
                        Мессеж
                      </button>
                      <button onClick={() => handleUnfriend(friend.id)} style={{
                        padding: "7px 12px", borderRadius: 10,
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all .15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#dc2626"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                        title="Найзаас хасах">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60, animation: "fadeUp .3s ease both" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: P.text2, marginBottom: 4 }}>Хүлээгдэж буй хүсэлт байхгүй</p>
              <p style={{ fontSize: 13, color: P.muted }}>Найзын хүсэлт ирэхэд энд харагдана</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {requests.map((req, i) => (
                <div key={req.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px",
                  background: P.surface, border: `1px solid ${P.border}`,
                  borderRadius: 14,
                  animation: `fadeUp .3s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s both`,
                }}>
                  <Avatar user={req.sender} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: P.text, margin: 0 }}>{req.sender?.username}</p>
                    <p style={{ fontSize: 11, color: P.muted, margin: 0 }}>Танд найзын хүсэлт илгээсэн</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleAccept(req)} style={{
                      padding: "6px 14px", borderRadius: 8, border: "none",
                      background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                      color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all .15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#16a34a"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.15)"; e.currentTarget.style.color = "#4ade80"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"; }}>
                      ✓ Зөвшөөрөх
                    </button>
                    <button onClick={() => handleDecline(req.id)} style={{
                      padding: "6px 14px", borderRadius: 8,
                      background: "transparent", border: `1px solid ${P.bd2}`,
                      color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all .15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = P.bd2; e.currentTarget.style.color = P.muted; }}>
                      Татгалзах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
