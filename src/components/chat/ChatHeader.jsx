
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";

const ChatHeader = ({ channel, onlineCount, onToggleMembers, showMembers, onSearch, workspaceId, isOwner, inCall, onJoinAudio, onJoinVideo, onLeaveCall, isMuted, isCameraOff }) => {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const P = {
    bg:           isDark ? "#080B2A"                : "#ffffff",
    border:       isDark ? "#1B3066"                : "#c8c8dc",
    btnBgHover:   isDark ? "rgba(107,115,153,0.18)" : "rgba(27,48,102,0.08)",
    btnBgActive:  isDark ? "rgba(107,115,153,0.22)" : "rgba(27,48,102,0.12)",
    btnBorder:    isDark ? "rgba(107,115,153,0.35)" : "rgba(27,48,102,0.2)",
    btnText:      isDark ? "#b8bdd8"                : "#1B3066",
    btnTextHover: isDark ? "#F0F0F5"                : "#080B2A",
    btnMuted:     isDark ? "#6B7399"                : "#6B7399",
  };

  const btnStyle = (active = false) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", transition: "all 0.15s",
    background: active ? P.btnBgActive : "transparent",
    border: `1px solid ${active ? P.btnBorder : "transparent"}`,
    color: active ? P.btnText : P.btnMuted,
  });

  const onBtnHover = (e, override = {}) => {
    e.currentTarget.style.background  = override.bg   || P.btnBgHover;
    e.currentTarget.style.color       = override.text || P.btnTextHover;
    e.currentTarget.style.borderColor = override.bd   || P.btnBorder;
  };
  const onBtnLeave = (e, active = false) => {
    e.currentTarget.style.background  = active ? P.btnBgActive : "transparent";
    e.currentTarget.style.color       = active ? P.btnText : P.btnMuted;
    e.currentTarget.style.borderColor = active ? P.btnBorder : "transparent";
  };

  const iconBtn = (bg, color) => ({
    width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
    background: bg, color: color,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  });

  return (
    <div style={{
      minHeight: 48,
      borderBottom: `1px solid ${P.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 12px",
      background: P.bg,
      flexShrink: 0,
      gap: 6,
      boxShadow: isDark ? "0 1px 0 rgba(27,48,102,0.4)" : "0 1px 0 rgba(8,11,42,0.06)",
      animation: "fadeIn .2s ease both",
    }}>

      {/* Left — channel name */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: isDark ? "rgba(27,48,102,0.5)" : "rgba(27,48,102,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="fa-solid fa-hashtag" style={{fontSize:12, color: isDark ? "#6B7399" : "#1B3066"}}></i>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#F0F0F5" : "#080B2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {channel?.name || "channel"}
        </span>
        {/* Online pill — desktop only */}
        <div className="header-online-pill" style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 20, flexShrink: 0,
          background: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: isDark ? "#4ade80" : "#16a34a", whiteSpace: "nowrap" }}>
            {onlineCount} online
          </span>
        </div>
      </div>

      {/* Right — desktop buttons */}
      <div className="header-btn-desktop" style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <button style={btnStyle(false)} onClick={onSearch}
          onMouseEnter={e => onBtnHover(e)} onMouseLeave={e => onBtnLeave(e)}>
          <i className="fa-solid fa-magnifying-glass" style={{fontSize:11}}></i> Search
        </button>
        {isOwner && (
          <button style={btnStyle(false)} onClick={() => navigate(`/bans/${workspaceId}`)}
            onMouseEnter={e => onBtnHover(e, { bg: isDark?"rgba(239,68,68,0.1)":"rgba(239,68,68,0.06)", text: isDark?"#fca5a5":"#dc2626", bd: isDark?"rgba(239,68,68,0.25)":"rgba(239,68,68,0.2)" })}
            onMouseLeave={e => onBtnLeave(e)}>
            <i className="fa-solid fa-ban" style={{fontSize:11}}></i> Bans
          </button>
        )}
        <button onClick={onToggleMembers}
          style={{ ...btnStyle(showMembers), background: showMembers ? P.btnBgActive : "transparent" }}
          onMouseEnter={e => { if (!showMembers) onBtnHover(e); }}
          onMouseLeave={e => onBtnLeave(e, showMembers)}>
          <i className="fa-solid fa-users" style={{fontSize:11}}></i> Members
        </button>
      </div>

      {/* Right — mobile buttons */}
      <div className="header-btn-mobile" style={{ display: "none", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button onClick={onSearch} style={iconBtn("transparent", P.btnMuted)} title="Search">
          <i className="fa-solid fa-magnifying-glass" style={{fontSize:13}}></i>
        </button>
        {inCall ? (
          <button onClick={onLeaveCall} style={iconBtn("rgba(239,68,68,0.15)", "#f87171")} title="Дуудлага дуусгах">
            <i className="fa-solid fa-phone-slash" style={{fontSize:13}}></i>
          </button>
        ) : (
          <>
            <button onClick={onJoinAudio} style={iconBtn("rgba(34,197,94,0.15)", "#4ade80")} title="Дуут дуудлага">
              <i className="fa-solid fa-phone" style={{fontSize:13}}></i>
            </button>
            <button onClick={onJoinVideo} style={iconBtn("rgba(99,102,241,0.15)", "#818cf8")} title="Видео дуудлага">
              <i className="fa-solid fa-video" style={{fontSize:13}}></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
