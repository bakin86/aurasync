import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useCall } from "../context/CallContext.jsx";
import Sidebar from "../components/sidebar/Sidebar.jsx";
import MessageInput from "../components/chat/MessageInput.jsx";
import UserProfilePopup from "../components/ui/UserProfilePopup.jsx";
import VoiceMessage from "../components/chat/VoiceMessage.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");

const fmtTime = d => d ? new Date(d).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = d => {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Өнөөдөр";
  if (date.toDateString() === yesterday.toDateString()) return "Өчигдөр";
  return date.toLocaleDateString("mn-MN", { month: "long", day: "numeric" });
};

const imgSrc = (path) => !path ? null : path.startsWith("http") ? path : API_BASE + path;

// ── Avatar ────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 36, onClick }) => {
  const hue = (user?.username?.charCodeAt(0) || 0) % 360;
  const src = imgSrc(user?.avatar);
  if (src) return <img src={src} alt="" onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: onClick ? "pointer" : "default" }} />;
  return (
    <div onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,hsl(${hue},40%,30%),hsl(${hue+30},40%,20%))`, display: "flex", alignItems: "center", justifyContent: "center", color: "#F0F0F5", fontSize: size * 0.38, fontWeight: 700, cursor: onClick ? "pointer" : "default" }}>
      {user?.username?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

// ── File attachment ───────────────────────────────────────────────────────
const FileAttach = ({ fileUrl, fileType }) => {
  if (!fileUrl) return null;
  const url = imgSrc(fileUrl);
  if (fileType?.startsWith("audio/")) return <VoiceMessage fileUrl={url} />;
  if (fileType?.startsWith("image/")) return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
      <img src={url} alt="" style={{ maxWidth: 300, maxHeight: 220, borderRadius: 10, border: "1px solid var(--border)", objectFit: "cover", display: "block" }} />
    </a>
  );
  const name = fileUrl.split("/").pop();
  const ext  = name.split(".").pop().toUpperCase();
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6, padding: "7px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, textDecoration: "none" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", background: "var(--surface3)", padding: "2px 6px", borderRadius: 4 }}>{ext}</span>
      <span style={{ fontSize: 13, color: "var(--text3)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <span style={{ fontSize: 12, color: "var(--text5)" }}>↗</span>
    </a>
  );
};

// ── Reaction bar ──────────────────────────────────────────────────────────
const ReactionBar = ({ reactions = [], onReact, msgId, myId }) => {
  const grouped = reactions.reduce((a, r) => { (a[r.emoji] = a[r.emoji] || []).push(r); return a; }, {});
  if (Object.keys(grouped).length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
      {Object.entries(grouped).map(([emoji, users]) => {
        const mine = users.some(u => (u.userId || u.user?.id) === myId);
        const names = users.map(u => u.username || u.user?.username).filter(Boolean).join(", ");
        return (
          <button key={emoji} onClick={() => onReact(msgId, emoji)}
            title={names}
            style={{
              display: "flex", alignItems: "center", gap: 3, padding: "2px 7px",
              background: mine ? "rgba(27,48,102,0.35)" : "var(--surface2)",
              border: `1px solid ${mine ? "var(--border2)" : "var(--border)"}`,
              borderRadius: 20, cursor: "pointer", fontSize: 13, transition: "all .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(27,48,102,0.3)"}
            onMouseLeave={e => e.currentTarget.style.background = mine ? "rgba(27,48,102,0.35)" : "var(--surface2)"}>
            <span>{emoji}</span>
            <span style={{ fontSize: 11, color: "var(--text4)", fontWeight: 600 }}>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Call log row ──────────────────────────────────────────────────────────
const CallLogRow = ({ msg, myId }) => {
  const isVideo  = !!msg.withVideo;
  const duration = msg.duration;
  const time     = msg.time ? new Date(msg.time).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <span style={{ fontSize: 15 }}>{isVideo ? "📹" : "📞"}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)" }}>{isVideo ? "Видео дуудлага" : "Дуут дуудлага"}</span>
        {duration && <span style={{ fontSize: 11, color: "var(--text5)" }}>· ⏱ {duration}</span>}
        {time     && <span style={{ fontSize: 10, color: "var(--text5)", opacity: .7 }}>{time}</span>}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DMPage() {
  const { userId }  = useParams();
  const { user }    = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme }   = useTheme();
  const { incomingCall, clearIncomingCall } = useCall();
  const navigate    = useNavigate();
  const isDark = theme === "dark";

  const [workspaces,  setWorkspaces]  = useState([]);
  const [channels,    setChannels]    = useState([]);
  const [curWs,       setCurWs]       = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [target,      setTarget]      = useState(null);
  const [isBlocked,   setIsBlocked]   = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [blockModal,  setBlockModal]  = useState(false);
  const [replyTo,     setReplyTo]     = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [profilePopup, setProfilePopup] = useState(null);
  const bottomRef = useRef(null);
  const canMsg = !isBlocked && !isBlockedBy;
  const isOnline = onlineUsers.includes(userId);

  // Load workspaces
  useEffect(() => {
    api.get("/workspaces").then(async res => {
      const ws = res.data.data || [];
      setWorkspaces(ws);
      const lastId = localStorage.getItem("lastWorkspaceId") || ws[0]?.id;
      const cur = ws.find(w => w.id === lastId) || ws[0] || null;
      setCurWs(cur);
      if (cur) {
        const chRes = await api.get(`/channels/workspace/${cur.id}`).catch(() => ({ data: { data: [] } }));
        setChannels(chRes.data.data || []);
      }
    }).catch(console.error);
  }, []);

  // Load messages + target + blocks
  useEffect(() => {
    if (!userId) return;
    setMessages([]); setReplyTo(null);
    Promise.all([
      api.get(`/dm/${userId}`),
      api.get(`/blocks/check/${userId}`).catch(() => ({ data: { data: {} } })),
      api.get(`/blocks/blocked-by/${userId}`).catch(() => ({ data: { data: {} } })),
    ]).then(([dmRes, blkRes, blkByRes]) => {
      const msgs = dmRes.data.data || [];
      setMessages(msgs);
      const other = msgs.find(m => m.senderId !== user?.id);
      if (other) setTarget(other.sender || other.receiver || null);
      setIsBlocked(!!blkRes.data.data?.blocked);
      setIsBlockedBy(!!blkByRes.data.data?.blockedBy);
    }).catch(console.error);
    api.get(`/dm/users/${curWs?.id || "none"}`).then(r => {
      const found = (r.data.data || []).find(m => m.id === userId);
      if (found) setTarget(found);
    }).catch(() => {});
  }, [userId, user?.id]);

  // sessionStorage call log backup
  useEffect(() => {
    if (!user?.id) return;
    try {
      const backup = sessionStorage.getItem("lastCallLog");
      if (!backup) return;
      const log = JSON.parse(backup);
      if (log.partnerId === userId) {
        sessionStorage.removeItem("lastCallLog");
        setMessages(p => p.find(m => m.id === log.id) ? p : [...p, { ...log, isCallLog: true }]);
      }
    } catch {}
  }, [userId, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  // Socket
  useEffect(() => {
    if (!socket || !user?.id) return;

    const onMsg = msg => {
      if ((msg.senderId === userId && msg.receiverId === user.id) ||
          (msg.senderId === user.id && msg.receiverId === userId)) {
        setMessages(p => p.find(m => m.id === msg.id) ? p : [...p, msg]);
        if (!target && msg.senderId !== user.id) setTarget(msg.sender || null);
      }
    };
    const onCallLog = log => {
      const myId = user.id;
      if (!((log.callerId === myId && log.calleeId === userId) || (log.calleeId === myId && log.callerId === userId))) return;
      setMessages(p => p.find(m => m.id === log.id) ? p : [...p, { ...log, isCallLog: true, id: log.id || `call_${Date.now()}` }]);
    };
    const onTyping = ({ username: uname, typing }) => {
      if (uname === user.username) return;
      setTypingUsers(p => typing ? [...new Set([...p, uname])] : p.filter(u => u !== uname));
    };

    socket.on("dm_new_message", onMsg);
    socket.on("dm_call_log",    onCallLog);
    socket.on("user_typing",    onTyping);
    return () => {
      socket.off("dm_new_message", onMsg);
      socket.off("dm_call_log",    onCallLog);
      socket.off("user_typing",    onTyping);
    };
  }, [socket, userId, user?.id]);

  // Handlers
  const handleSend = async (content, fileUrl, fileType) => {
    if (!canMsg) return;
    try {
      const body = { content, fileUrl, fileType };
      if (replyTo) body.replyTo = { id: replyTo.id, content: replyTo.content, username: replyTo.sender?.username || (replyTo.senderId === user?.id ? user?.username : target?.username) };
      const res = await api.post(`/dm/${userId}`, body);
      setMessages(p => [...p, res.data.data]);
      socket?.emit("dm_send", { toUserId: userId, message: res.data.data });
      setReplyTo(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/dm/${id}`);
      setMessages(p => p.map(m => m.id === id ? { ...m, deleted: true, content: "" } : m));
    } catch (e) { console.error(e); }
  };

  const handleEdit = async (id, content) => {
    try {
      await api.patch(`/dm/${id}`, { content });
      setMessages(p => p.map(m => m.id === id ? { ...m, content, edited: true } : m));
    } catch (e) { console.error(e); }
  };

  const handlePin = async msg => {
    try {
      await api.patch(`/dm/${msg.id}/pin`);
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m));
    } catch (e) { console.error(e); }
  };

  const handleReaction = async (msgId, emoji) => {
    // Optimistic update
    setMessages(p => p.map(m => {
      if (m.id !== msgId) return m;
      const reactions = Array.isArray(m.reactions) ? m.reactions : [];
      const idx = reactions.findIndex(r => r.emoji === emoji && r.userId === user?.id);
      if (idx >= 0) return { ...m, reactions: reactions.filter((_, i) => i !== idx) };
      return { ...m, reactions: [...reactions, { emoji, userId: user?.id, username: user?.username }] };
    }));
    // Persist to backend
    try {
      const res = await api.post(`/dm/${msgId}/react`, { emoji });
      if (res.data.data) {
        setMessages(p => p.map(m => m.id === msgId ? { ...m, reactions: res.data.data.reactions || [] } : m));
      }
    } catch (e) { console.error("DM reaction failed:", e); }
  };

  const handleBlock = async () => {
    try {
      const res = await api.post(`/blocks/${userId}`);
      setIsBlocked(!!res.data.data?.blocked);
      setBlockModal(false);
    } catch (e) { console.error(e); }
  };

  const handleTyping = (isTyping) => {
    if (!socket) return;
    if (isTyping) socket.emit("typing_start", { channelId: `dm_${userId}` });
    else socket.emit("typing_stop", { channelId: `dm_${userId}` });
  };

  const pinnedMsgs = messages.filter(m => m.pinned && !m.deleted && !m.isCallLog);

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--bg)", overflow: "hidden" }}>
      <Sidebar workspaces={workspaces} channels={channels} setChannels={setChannels}
        currentWorkspace={curWs} onProfileOpen={() => {}} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{ height: 48, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Avatar user={target} size={30} onClick={e => setProfilePopup({ user: target, position: { x: e.clientX, y: e.clientY } })} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--surface)", background: isOnline ? "#22c55e" : "var(--text5)" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{target?.username || "..."}</p>
              <p style={{ fontSize: 11, margin: 0, fontWeight: 500, color: isBlocked || isBlockedBy ? "#f87171" : isOnline ? "#22c55e" : "var(--text5)" }}>
                {isBlocked ? "🚫 Блоклосон" : isBlockedBy ? "🚫 Блоклогдсон" : isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {canMsg && (<>
              <HeaderBtn onClick={() => navigate(`/call/${userId}?mode=call&video=0`)} accent="green" title="Audio call"><i className="fa-solid fa-phone" style={{fontSize:13}}></i></HeaderBtn>
              <HeaderBtn onClick={() => navigate(`/call/${userId}?mode=call&video=1`)} accent="indigo" title="Video call"><i className="fa-solid fa-video" style={{fontSize:13}}></i></HeaderBtn>
            </>)}
              <HeaderBtn onClick={() => setBlockModal(true)} accent="red" title={isBlocked ? "Unblock" : "Block"}><i className="fa-solid fa-ban" style={{fontSize:13}}></i></HeaderBtn>
          </div>
        </div>

        {/* Incoming call banner */}
        {incomingCall && (
          <div style={{ padding: "8px 16px", background: "rgba(34,197,94,.08)", borderBottom: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.2s infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>{incomingCall.fromUsername} {incomingCall.withVideo ? "📹 видео" : "📞 дуут"} залж байна…</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { try { localStorage.setItem("aura_incoming_call", JSON.stringify(incomingCall)); } catch {} navigate(`/call/${incomingCall.fromUserId}?mode=answer&video=${incomingCall.withVideo?"1":"0"}`); setTimeout(clearIncomingCall, 800); }} style={{ padding: "5px 14px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Хүлээн авах</button>
              <button onClick={() => { socket?.emit("dm_call_end", { toUserId: incomingCall.fromUserId }); clearIncomingCall(); }} style={{ padding: "5px 12px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Татгалзах</button>
            </div>
          </div>
        )}

        {/* Pinned */}
        {pinnedMsgs.length > 0 && (
          <div style={{ padding: "5px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-thumbtack" style={{fontSize:12}}></i>
            <span style={{ fontSize: 11, color: "var(--text5)", fontWeight: 600 }}>Тогтоосон:</span>
            <span style={{ fontSize: 12, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{pinnedMsgs[pinnedMsgs.length - 1]?.content}</span>
          </div>
        )}

        {/* Block banners */}
        {isBlocked    && <div style={{ padding: "6px 20px", background: "rgba(239,68,68,.06)", borderBottom: "1px solid rgba(239,68,68,.15)", textAlign: "center" }}><p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>Та энэ хэрэглэгчийг блоклосон байна.</p></div>}
        {isBlockedBy && !isBlocked && <div style={{ padding: "6px 20px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", textAlign: "center" }}><p style={{ fontSize: 12, color: "var(--text5)", margin: 0 }}>Энэ хэрэглэгчтэй харилцах боломжгүй.</p></div>}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px", display: "flex", flexDirection: "column" }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text5)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text4)", marginBottom: 4 }}>{canMsg ? `${target?.username || "Хэрэглэгч"}-тэй чатлаарай` : "Мессеж байхгүй"}</p>
              <p style={{ fontSize: 13, color: "var(--text5)" }}>Энэ бол хувийн харилцаа</p>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.isCallLog || msg.type === "call_log") return <CallLogRow key={msg.id} msg={msg} myId={user?.id} />;

            const isOwn  = msg.senderId === user?.id;
            const sender = isOwn ? user : target;
            const prev   = messages[i - 1];
            const showDate   = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
            const showAvatar = !prev || prev.isCallLog || prev.senderId !== msg.senderId || (new Date(msg.createdAt) - new Date(prev.createdAt)) > 5 * 60 * 1000;
            const rt = (() => {
              if (!msg.replyTo) return null;
              try { return typeof msg.replyTo === "string" ? JSON.parse(msg.replyTo) : msg.replyTo; } catch { return null; }
            })();

            return (
              <MsgItem key={msg.id} msg={msg} isOwn={isOwn} sender={sender} showAvatar={showAvatar} showDate={showDate}
                rt={rt} myId={user?.id}
                onReply={() => setReplyTo(msg)}
                onDelete={() => handleDelete(msg.id)}
                onEdit={(id, content) => handleEdit(id, content)}
                onPin={() => handlePin(msg)}
                onReact={handleReaction}
                onAvatarClick={e => setProfilePopup({ user: sender, position: { x: e.clientX, y: e.clientY } })}
              />
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px", marginTop: 4 }}>
              <div style={{ width: 36 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text5)", display: "inline-block", animation: `bounce 1.2s ease-in-out ${i*.2}s infinite` }} />)}
                </div>
                <span style={{ fontSize: 12, color: "var(--text5)", fontStyle: "italic" }}>{typingUsers.join(", ")} бичиж байна…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply bar */}
        {replyTo && (
          <div style={{ padding: "5px 16px", borderTop: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-reply" style={{fontSize:13}}></i>
            <span style={{ fontSize: 12, color: "var(--text5)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <b style={{ color: "var(--text3)" }}>{replyTo.sender?.username || (replyTo.senderId === user?.id ? user?.username : target?.username)}</b>
              {" "}{replyTo.content?.slice(0, 60)}
            </span>
            <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text5)", display: "flex", alignItems: "center" }}><i className="fa-solid fa-xmark" style={{fontSize:13}}></i></button>
          </div>
        )}

        <MessageInput onSend={handleSend} onTyping={handleTyping} channelName={target?.username} disabled={!canMsg} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      {/* Block modal */}
      {blockModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setBlockModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 200, backdropFilter: "blur(6px)", background: isDark ? "rgba(8,11,42,.75)" : "rgba(8,11,42,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 360, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, boxShadow: "0 24px 60px rgba(8,11,42,.6)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{isBlocked ? "Unblock" : "Block"} @{target?.username}?</h3>
            <p style={{ fontSize: 13, color: "var(--text5)", marginBottom: 20, lineHeight: 1.6 }}>{isBlocked ? "Тэд дахин мессеж илгээх, залгах боломжтой болно." : "Тэд танд мессеж илгээх, залгах боломжгүй болно."}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBlockModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--border2)", background: "transparent", color: "var(--text5)", fontSize: 13, cursor: "pointer" }}>Болих</button>
              <button onClick={handleBlock} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: isBlocked ? "#16a34a" : "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{isBlocked ? "Unblock" : "Block"}</button>
            </div>
          </div>
        </div>
      )}

      {profilePopup && <UserProfilePopup user={profilePopup.user} position={profilePopup.position} onClose={() => setProfilePopup(null)} />}

      <style>{`
        @keyframes vsp    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
      `}</style>
    </div>
  );
}

// ── Header button ─────────────────────────────────────────────────────────
function HeaderBtn({ onClick, title, accent, children }) {
  const [h, setH] = useState(false);
  const getBg = () => {
    if (!h) return accent === "green" ? "rgba(34,197,94,0.12)"
                   : accent === "indigo" ? "rgba(99,102,241,0.12)"
                   : accent === "red" ? "rgba(239,68,68,0.1)"
                   : "transparent";
    return accent === "green" ? "#16a34a"
         : accent === "indigo" ? "#4f46e5"
         : accent === "red" ? "rgba(239,68,68,.85)"
         : "var(--surface2)";
  };
  const getColor = () => {
    if (!h) return accent === "green" ? "#4ade80"
                  : accent === "indigo" ? "#818cf8"
                  : accent === "red" ? "#f87171"
                  : "var(--text5)";
    return (accent === "green" || accent === "indigo" || accent === "red") ? "#fff" : "var(--text)";
  };
  const getBorder = () => {
    return accent === "green" ? "1px solid rgba(34,197,94,0.3)"
         : accent === "indigo" ? "1px solid rgba(99,102,241,0.3)"
         : accent === "red" ? "1px solid rgba(239,68,68,0.25)"
         : "1px solid var(--border)";
  };
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      padding: "6px 12px", borderRadius: 8, border: getBorder(), cursor: "pointer", transition: "all .15s",
      display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
      background: getBg(), color: getColor(),
    }}>{children}</button>
  );
}

// ── Message item ──────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["👍","❤️","😂","😮","😢","🔥","✅","😍"];

function DMEmojiPicker({ onSelect, onClose, anchorRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", fn), 0);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={ref} style={{
      position:"absolute", right:0, bottom:"calc(100% + 6px)", zIndex:200,
      background:"#1B1F2E", border:"1px solid rgba(107,115,153,0.3)",
      borderRadius:12, padding:"8px 10px", display:"flex", gap:2,
      boxShadow:"0 12px 32px rgba(0,0,0,0.5)",
      animation:"popIn .12s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <div style={{ position:"absolute", bottom:-5, right:14, width:10, height:10, background:"#1B1F2E", border:"1px solid rgba(107,115,153,0.3)", borderTop:"none", borderLeft:"none", transform:"rotate(45deg)" }} />
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} style={{
          width:36, height:36, borderRadius:8, border:"none", background:"transparent",
          cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .1s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "scale(1.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

function MsgItem({ msg, isOwn, sender, showAvatar, showDate, rt, myId, onReply, onDelete, onEdit, onPin, onReact, onAvatarClick }) {
  const [hover,     setHover]     = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [editVal,   setEditVal]   = useState("");
  const editRef  = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => { if (editing && editRef.current) { editRef.current.focus(); editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length); } }, [editing]);

  return (
    <>
      {showDate && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 6px", padding: "0 4px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text5)", fontWeight: 500, whiteSpace: "nowrap" }}>{fmtDate(msg.createdAt)}</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
      )}
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowEmoji(false); }} style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: showAvatar ? "8px 4px 2px" : "1px 4px", borderRadius: 8,
        background: hover ? "var(--surface2)" : "transparent",
        position: "relative", transition: "background .1s",
        borderLeft: msg.pinned ? "2px solid var(--border2)" : "2px solid transparent",
        animation: showAvatar ? "slideIn .18s ease both" : "none",
      }}>
        <div style={{ width: 36, flexShrink: 0 }}>
          {showAvatar && <Avatar user={sender} size={32} onClick={onAvatarClick} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {showAvatar && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
              <span onClick={onAvatarClick} style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                {sender?.username}
              </span>
              <span style={{ fontSize: 11, color: "var(--text5)" }}>{fmtTime(msg.createdAt)}</span>
              {msg.edited && <span style={{ fontSize: 10, color: "var(--text5)", fontStyle: "italic" }}>(засагдсан)</span>}
              {msg.pinned && <span style={{ fontSize: 10, color: "var(--text5)" }}>· 📌</span>}
            </div>
          )}
          {/* Reply preview */}
          {rt && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 8px", marginBottom: 4, borderRadius: 6, background: "rgba(107,115,153,.1)", borderLeft: "2px solid #6B7399" }}>
              <i className="fa-solid fa-reply" style={{fontSize:10}}></i>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7399" }}>{rt.username} </span>
                <span style={{ fontSize: 11, color: "var(--text5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: 220 }}>{rt.content}</span>
              </div>
            </div>
          )}
          {/* Content */}
          {msg.deleted ? (
            <p style={{ fontSize: 13, color: "var(--text5)", fontStyle: "italic", margin: 0 }}>Мессеж устгагдсан</p>
          ) : editing ? (
            <div>
              <input ref={editRef} value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { onEdit(msg.id, editVal); setEditing(false); }
                  if (e.key === "Escape") setEditing(false);
                }}
                style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "7px 12px", color: "var(--text)", fontSize: 13, outline: "none" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                <button onClick={() => { onEdit(msg.id, editVal); setEditing(false); }} style={{ padding: "3px 12px", background: "linear-gradient(135deg,#1B3066,#2a4080)", border: "none", borderRadius: 6, color: "#F0F0F5", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Хадгалах</button>
                <button onClick={() => setEditing(false)} style={{ padding: "3px 12px", background: "var(--surface3)", border: "none", borderRadius: 6, color: "var(--text4)", fontSize: 11, cursor: "pointer" }}>Болих</button>
                <span style={{ fontSize: 11, color: "var(--text5)", alignSelf: "center" }}>Enter · Esc</span>
              </div>
            </div>
          ) : (
            <>
              {msg.content && <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, wordBreak: "break-word", margin: 0 }}>{msg.content}</p>}
              <FileAttach fileUrl={msg.fileUrl} fileType={msg.fileType} />
              <ReactionBar reactions={msg.reactions || []} onReact={onReact} msgId={msg.id} myId={myId} />
            </>
          )}
        </div>
        {/* Hover actions */}
        {hover && !msg.deleted && !editing && (
          <div style={{ position: "absolute", right: 8, top: showAvatar ? 6 : -10, display: "flex", gap: 2, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8, padding: "3px 4px", boxShadow: "0 4px 12px rgba(0,0,0,.25)", zIndex: 10 }}>
            {[
              { icon: <i className="fa-regular fa-face-smile" style={{fontSize:12}}></i>, fn: () => setShowEmoji(p => !p), title: "Emoji", cond: true, isEmoji: true },
              { icon: <i className="fa-solid fa-reply" style={{fontSize:12}}></i>, fn: onReply,     title: "Хариулах",  cond: true },
              { icon: <i className="fa-solid fa-thumbtack" style={{fontSize:12}}></i>, fn: onPin,       title: msg.pinned ? "Тогтоолтыг арилгах" : "Тогтоох", cond: true },
              { icon: <i className="fa-solid fa-pen" style={{fontSize:12}}></i>, fn: () => { setEditVal(msg.content || ""); setEditing(true); }, title: "Засах",    cond: isOwn },
              { icon: <i className="fa-solid fa-trash" style={{fontSize:12}}></i>, fn: onDelete,    title: "Устгах",   cond: isOwn, danger: true },
            ].filter(b => b.cond).map((b, i) => (
              b.isEmoji
                ? <div key={i} ref={emojiRef} style={{ position:"relative" }}>
                    <ActionBtn onClick={b.fn} title={b.title} active={showEmoji}>{b.icon}</ActionBtn>
                    {showEmoji && <DMEmojiPicker onSelect={emoji => { onReact(msg.id, emoji); }} onClose={() => setShowEmoji(false)} anchorRef={emojiRef} />}
                  </div>
                : <ActionBtn key={i} onClick={b.fn} title={b.title} danger={b.danger}>{b.icon}</ActionBtn>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}} @keyframes popIn{from{opacity:0;transform:scale(.85) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </>
  );
}

function ActionBtn({ onClick, danger, title, active, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
      background: active || h ? (danger ? "rgba(239,68,68,.12)" : "var(--surface3)") : "none",
      color: active || h ? (danger ? "#fca5a5" : "var(--text)") : "var(--text5)",
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s",
    }}>{children}</button>
  );
}
