import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import api from "../../api/axios.js";
import UserProfilePopup from "../ui/UserProfilePopup.jsx";
import VoiceMessage from "./VoiceMessage.jsx";
import { imgUrl } from "../../utils/url.js";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

const QUICK = ["👍","❤️","😂","😮","😢","🔥","✅","😍"];

const formatTime = d => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
const formatDate = d => {
  const date = new Date(d), today = new Date(), yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Өнөөдөр";
  if (date.toDateString() === yesterday.toDateString()) return "Өчигдөр";
  return date.toLocaleDateString([], { month:"long", day:"numeric" });
};

// ── Avatar ────────────────────────────────────────────────────────────────
const UserAvatar = ({ user, size = 32, onClick }) => {
  const grads = ["linear-gradient(135deg,#1B3066,#2a4080)","linear-gradient(135deg,#2a4080,#6B7399)","linear-gradient(135deg,#6B7399,#080B2A)","linear-gradient(135deg,#080B2A,#1B3066)"];
  const grad = grads[(user?.username?.charCodeAt(0)||0) % grads.length];
  const src = user?.avatar ? imgUrl(user.avatar) : null;
  if (src) return <img src={src} alt={user.username} onClick={onClick} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", cursor:"pointer", flexShrink:0 }} />;
  return (
    <div onClick={onClick} style={{ width:size, height:size, borderRadius:"50%", background:grad, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:size*.38, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
      {user?.username?.[0]?.toUpperCase()}
    </div>
  );
};

// ── File attachment ────────────────────────────────────────────────────────
const FileAttachment = ({ fileUrl, fileType }) => {
  if (!fileUrl) return null;
  const full = fileUrl.startsWith("http") ? fileUrl : API_BASE + fileUrl;
  if (fileType?.startsWith("audio/")) return <VoiceMessage fileUrl={full} />;
  if (fileType?.startsWith("image/")) return (
    <a href={full} target="_blank" rel="noreferrer" style={{ display:"block", marginTop:8 }}>
      <img src={full} alt="attachment" style={{ maxWidth:320, maxHeight:240, borderRadius:10, border:"1px solid var(--border)", objectFit:"cover", display:"block" }} />
    </a>
  );
  const filename = fileUrl.split("/").pop();
  const ext = filename.split(".").pop().toUpperCase();
  return (
    <a href={full} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:8, padding:"8px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:9, textDecoration:"none" }}>
      <span style={{ fontSize:10, fontWeight:700, color:"var(--text3)", background:"var(--surface3)", padding:"2px 6px", borderRadius:4 }}>{ext}</span>
      <span style={{ fontSize:13, color:"var(--text3)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{filename}</span>
      <span style={{ fontSize:12, color:"var(--text5)" }}>↗</span>
    </a>
  );
};

// ── Emoji quick picker — Discord style ────────────────────────────────────
const EmojiPicker = ({ onSelect, onClose, anchorRef }) => {
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
      background:"#1B1F2E",
      border:"1px solid rgba(107,115,153,0.3)",
      borderRadius:12, padding:"8px 10px",
      display:"flex", gap:2,
      boxShadow:"0 12px 32px rgba(0,0,0,0.5)",
      animation:"popIn .12s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      {/* Arrow */}
      <div style={{
        position:"absolute", bottom:-5, right:14,
        width:10, height:10, background:"#1B1F2E",
        border:"1px solid rgba(107,115,153,0.3)",
        borderTop:"none", borderLeft:"none",
        transform:"rotate(45deg)",
      }} />
      {QUICK.map(emoji => (
        <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} style={{
          width:36, height:36, borderRadius:8, border:"none",
          background:"transparent", cursor:"pointer",
          fontSize:20, display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .1s", lineHeight:1,
        }}
          onMouseEnter={ev => { ev.currentTarget.style.background = "rgba(255,255,255,0.1)"; ev.currentTarget.style.transform = "scale(1.2)"; }}
          onMouseLeave={ev => { ev.currentTarget.style.background = "transparent"; ev.currentTarget.style.transform = "scale(1)"; }}>
          {emoji}
        </button>
      ))}
    </div>
  );
};

// ── Reaction bar ───────────────────────────────────────────────────────────
const ReactionBar = ({ reactions=[], onReaction, messageId, currentUserId }) => {
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});
  if (Object.keys(grouped).length === 0) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3, flexWrap:"wrap", marginTop:4 }}>
      {Object.entries(grouped).map(([emoji, users]) => {
        const mine  = users.some(u => u.user?.id === currentUserId);
        const names = users.map(u => u.user?.username).filter(Boolean).join(", ");
        return (
          <button key={emoji} onClick={() => onReaction(messageId, emoji)}
            title={names}
            style={{
              display:"flex", alignItems:"center", gap:3, padding:"2px 7px",
              background: mine ? "rgba(27,48,102,0.35)" : "var(--surface2)",
              border:`1px solid ${mine ? "var(--border2)" : "var(--border)"}`,
              borderRadius:20, cursor:"pointer", fontSize:13, transition:"all .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(27,48,102,0.3)"}
            onMouseLeave={e => e.currentTarget.style.background = mine ? "rgba(27,48,102,0.35)" : "var(--surface2)"}>
            <span>{emoji}</span>
            <span style={{ fontSize:11, color:"var(--text4)", fontWeight:600 }}>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Reply preview ──────────────────────────────────────────────────────────
const ReplyPreview = ({ replyTo }) => {
  const rt = (() => {
    if (!replyTo) return null;
    if (typeof replyTo === "string") { try { return JSON.parse(replyTo); } catch { return null; } }
    return replyTo;
  })();
  if (!rt) return null;
  return (
    <div style={{ display:"flex", gap:6, padding:"3px 8px", marginBottom:4, borderRadius:6, background:"rgba(107,115,153,0.1)", borderLeft:"2px solid #6B7399" }}>
      <i className="fa-solid fa-reply" style={{fontSize:9, color:"#6B7399", flexShrink:0, marginTop:2}}></i>
      <span style={{ fontSize:11, color:"#6B7399", fontWeight:600 }}>{rt.username} </span>
      <span style={{ fontSize:11, color:"var(--text5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:220 }}>{rt.content}</span>
    </div>
  );
};

// ── Message Item ───────────────────────────────────────────────────────────
const MessageItem = ({ msg, isOwn, showAvatar, showDate, onReaction, onEdit, onDelete, onPin, onReply, onAvatarClick, currentUserId, socket, channelId }) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [editContent, setEditContent] = useState(msg.content || "");
  const inputRef      = useRef(null);
  const emojiAnchorRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing]);

  const handleEditSubmit = async () => {
    if (!editContent.trim() || editContent.trim() === msg.content) { setEditing(false); return; }
    try {
      const res = await api.patch(`/messages/${msg.id}`, { content: editContent.trim() });
      onEdit(res.data.data);
      socket?.emit("message_edited", { message: res.data.data, channelId });
      setEditing(false);
    } catch (err) { console.error(err); }
  };

  return (
    <>
      {showDate && (
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 8px", padding:"0 4px" }}>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
          <span style={{ fontSize:11, color:"var(--text5)", fontWeight:500, whiteSpace:"nowrap" }}>{formatDate(msg.createdAt)}</span>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
        </div>
      )}
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
        style={{
          display:"flex", alignItems:"flex-start", gap:10,
          padding: showAvatar ? "8px 4px 2px" : "1px 4px",
          borderRadius:8,
          background: showActions ? "rgba(107,115,153,0.08)" : "transparent",
          position:"relative",
          borderLeft: msg.pinned ? "2px solid var(--border2)" : "2px solid transparent",
          paddingLeft: msg.pinned ? 10 : 4,
          transition:"background .1s",
          animation: showAvatar ? "slideInRight .18s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}
      >
        {/* Avatar column */}
        <div style={{ width:36, flexShrink:0 }}>
          {showAvatar && <UserAvatar user={msg.user} size={32} onClick={e => onAvatarClick(e, msg.user)} />}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {showAvatar && (
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:2 }}>
              <span onClick={e => onAvatarClick(e, msg.user)} style={{ fontSize:13, fontWeight:700, color:"var(--text)", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                {msg.user?.username}
              </span>
              <span style={{ fontSize:11, color:"var(--text5)" }}>{formatTime(msg.createdAt)}</span>
              {msg.updatedAt && msg.updatedAt !== msg.createdAt && <span style={{ fontSize:10, color:"var(--text5)", fontStyle:"italic" }}>(засагдсан)</span>}
              {msg.pinned && <span style={{ fontSize:10, color:"var(--text5)" }}>· 📌</span>}
            </div>
          )}

          <ReplyPreview replyTo={msg.replyTo} />

          {msg.deleted
            ? <p style={{ fontSize:13, color:"var(--text5)", fontStyle:"italic", margin:0 }}>Мессеж устгагдсан</p>
            : editing
              ? (
                <div>
                  <input ref={inputRef} value={editContent} onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } if (e.key === "Escape") { setEditing(false); setEditContent(msg.content||""); } }}
                    style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, padding:"8px 12px", color:"var(--text)", fontSize:13, outline:"none" }} />
                  <div style={{ display:"flex", gap:6, marginTop:6 }}>
                    <button onClick={handleEditSubmit} style={{ padding:"4px 12px", background:"linear-gradient(135deg,#1B3066,#2a4080)", border:"none", borderRadius:6, color:"#F0F0F5", fontSize:11, fontWeight:600, cursor:"pointer" }}>Хадгалах</button>
                    <button onClick={() => { setEditing(false); setEditContent(msg.content||""); }} style={{ padding:"4px 12px", background:"var(--surface2)", border:"none", borderRadius:6, color:"var(--text4)", fontSize:11, cursor:"pointer" }}>Болих</button>
                  </div>
                </div>
              )
              : <>
                  {msg.content && <p style={{ fontSize:13, color:"var(--text3)", lineHeight:1.6, wordBreak:"break-word", margin:0 }}>{msg.content}</p>}
                  <FileAttachment fileUrl={msg.fileUrl} fileType={msg.fileType} />
                  {msg.thread?.replies?.length > 0 && (
                    <button onClick={() => onReply?.(msg)} style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:4, padding:"3px 8px", borderRadius:6, background:"rgba(27,48,102,0.2)", border:"1px solid rgba(107,115,153,0.25)", color:"#6B7399", fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(27,48,102,0.35)"; e.currentTarget.style.color = "#b8bdd8"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(27,48,102,0.2)"; e.currentTarget.style.color = "#6B7399"; }}>
                      <i className="fa-solid fa-reply" style={{fontSize:9}}></i>
                      {msg.thread.replies.length} хариу
                    </button>
                  )}
                  <ReactionBar reactions={msg.reactions||[]} onReaction={onReaction} messageId={msg.id} currentUserId={currentUserId} />
                </>
          }
        </div>

        {/* Hover action bar */}
        {showActions && !msg.deleted && !editing && (
          <div style={{
            position:"absolute", right:8, top: showAvatar ? 6 : -14,
            display:"flex", alignItems:"center", gap:2,
            background:"var(--surface)", border:"1px solid var(--border2)",
            borderRadius:10, padding:"3px 5px",
            boxShadow:"0 4px 16px rgba(0,0,0,0.25)", zIndex:20,
          }}>
            {/* Quick emoji */}
            <div style={{ position:"relative" }} ref={emojiAnchorRef}>
              <ActionBtn onClick={() => setShowEmoji(p => !p)} title="Emoji реакц нэмэх" active={showEmoji}>
                <i className="fa-regular fa-face-smile" style={{fontSize:12}}></i>
              </ActionBtn>
              {showEmoji && (
                <EmojiPicker
                  onSelect={e => onReaction(msg.id, e)}
                  onClose={() => setShowEmoji(false)}
                  anchorRef={emojiAnchorRef}
                />
              )}
            </div>

            <div style={{ width:1, height:16, background:"var(--border)", margin:"0 1px" }} />

            <ActionBtn onClick={() => onReply?.(msg)} title="Хариулах"><i className="fa-solid fa-reply" style={{fontSize:12}}></i></ActionBtn>
            {isOwn && <ActionBtn onClick={() => { setEditing(true); setEditContent(msg.content||""); }} title="Засах"><i className="fa-solid fa-pen" style={{fontSize:12}}></i></ActionBtn>}
            <ActionBtn onClick={() => onPin(msg)} title={msg.pinned ? "Тогтоолтыг арилгах" : "Тогтоох"} active={msg.pinned}><i className="fa-solid fa-thumbtack" style={{fontSize:12}}></i></ActionBtn>
            {isOwn && <ActionBtn onClick={() => onDelete(msg.id)} title="Устгах" danger><i className="fa-solid fa-trash" style={{fontSize:12}}></i></ActionBtn>}
          </div>
        )}
      </div>
    </>
  );
};

const ActionBtn = ({ onClick, title, danger, active, children }) => (
  <button onClick={onClick} title={title} style={{
    width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
    background:"none", border:"none", cursor:"pointer",
    color: active ? "var(--text)" : danger ? "var(--text5)" : "var(--text5)",
    borderRadius:6, transition:"all .1s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = danger ? "rgba(239,68,68,0.12)" : "var(--surface2)"; e.currentTarget.style.color = danger ? "#fca5a5" : "var(--text)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = active ? "var(--text)" : "var(--text5)"; }}>
    {children}
  </button>
);

// ── MessageList ───────────────────────────────────────────────────────────
const MessageList = ({ messages, typingUsers, onReaction, onEdit, onDelete, onPin, onReply, socket, channelId }) => {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [profilePopup, setProfilePopup] = useState(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typingUsers]);

  const onAvatarClick = (e, u) => {
    e.stopPropagation();
    setProfilePopup({ user: u, position: { x: e.clientX, y: e.clientY } });
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"8px 20px", display:"flex", flexDirection:"column" }}>
      {messages.length === 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, color:"var(--text5)", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
          <p style={{ fontSize:14, fontWeight:500, color:"var(--text4)", marginBottom:4 }}>Мессеж байхгүй</p>
          <p style={{ fontSize:13, color:"var(--text5)" }}>Эхний мессежийг илгээ!</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const isOwn = msg.user?.id === user?.id;
        const prev  = messages[i-1];
        const showAvatar = !prev || prev.user?.id !== msg.user?.id || (new Date(msg.createdAt) - new Date(prev.createdAt)) > 5*60*1000;
        const showDate   = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
        return (
          <MessageItem key={msg.id} msg={msg} isOwn={isOwn} showAvatar={showAvatar} showDate={showDate}
            onReaction={onReaction} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onReply={onReply}
            onAvatarClick={onAvatarClick} currentUserId={user?.id} socket={socket} channelId={channelId} />
        );
      })}

      {typingUsers?.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 4px 4px 46px", marginTop:4 }}>
          <div style={{ display:"flex", gap:3, alignItems:"center" }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width:5, height:5, borderRadius:"50%", background:"var(--text5)", display:"inline-block", animation:`bounce 1.2s ease-in-out ${i*.2}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize:12, color:"var(--text5)", fontStyle:"italic" }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "бичиж байна" : "бичиж байна"}
          </span>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes popIn { from{opacity:0;transform:scale(.85) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div ref={bottomRef} />

      {profilePopup && (
        <UserProfilePopup user={profilePopup.user} position={profilePopup.position} onClose={() => setProfilePopup(null)} />
      )}
    </div>
  );
};

export default MessageList;
