import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "");

export default function WorkspaceSettingsModal({ workspace, workspaceId, onClose }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDark    = theme === "dark";

  const [tab, setTab]               = useState("general"); // "general" | "invite"
  const [name, setName]             = useState(workspace?.name || "");
  const [description, setDesc]      = useState(workspace?.description || "");
  const [avatarPreview, setPreview] = useState(
    workspace?.avatar
      ? (workspace.avatar.startsWith("http") ? workspace.avatar : API_BASE + workspace.avatar)
      : null
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [copied,     setCopied]     = useState(false);

  // Invite user state
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting,       setInviting]       = useState(false);
  const [inviteResult,   setInviteResult]   = useState(null); // { ok, message, user }
  const [invitedUsers,   setInvitedUsers]   = useState([]);

  const [myRole,     setMyRole]     = useState("MEMBER");
  const [roles,      setRoles]      = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#6B7399");
  const [editingRole, setEditingRole] = useState(null);
  const [members,    setMembers]     = useState([]); // {id, name, color}
  const [deleting,   setDeleting]   = useState(false);
  const [leaving,    setLeaving]    = useState(false);

  const fileRef = useRef(null);

  const P = {
    bg:      isDark ? "#080b28"  : "#ffffff",
    bg2:     isDark ? "#0c0f32"  : "#f4f4fb",
    border:  isDark ? "#151d4a"  : "#c8c8dc",
    bd2:     isDark ? "#1e2d6a"  : "#b0b0cc",
    text:    isDark ? "#F0F0F5"  : "#04061a",
    text2:   isDark ? "#b8bdd8"  : "#151d4a",
    muted:   isDark ? "#6B7399"  : "#6B7399",
    inputBg: isDark ? "#04061a"  : "#F0F0F5",
    shadow:  isDark ? "0 24px 60px rgba(8,11,42,0.8)" : "0 8px 40px rgba(8,11,42,0.15)",
  };

  // Load current user's role using useAuth user.id
  useEffect(() => {
    const wsId = workspaceId || workspace?.id;
    if (!wsId || !user?.id) return;
    api.get(`/workspaces/${wsId}/members`)
      .then(res => {
        const allMembers = res.data.data || [];
        const me = allMembers.find(m => m.id === user.id);
        setMyRole(me?.role || "MEMBER");
        setMembers(allMembers);
      })
      .catch(() => setMyRole("MEMBER"));
  }, [workspaceId, workspace?.id, user?.id]);

  // Load roles
  useEffect(() => {
    const wsId = workspaceId || workspace?.id;
    if (!wsId) return;
    api.get(`/workspaces/${wsId}/roles`).then(r => setRoles(r.data.data || [])).catch(() => {});
  }, [workspaceId, workspace?.id, tab]);

  const hue  = (workspace?.name?.charCodeAt(0) || 0) % 360;
  const grad = `linear-gradient(135deg,hsl(${hue},45%,25%),hsl(${hue+30},45%,18%))`;

  const inputSt = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
  };
  const onFocus = e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,.15)"; };
  const onBlur  = e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; };
  const labelSt = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: P.muted, marginBottom: 6 };

  // ── Save general settings ──────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      if (avatarFile) {
        const form = new FormData();
        form.append("avatar", avatarFile);
        await api.patch(`/workspaces/${workspaceId || workspace?.id}/avatar`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      if (name.trim() !== workspace?.name || description !== workspace?.description) {
        await api.patch(`/workspaces/${workspaceId || workspace?.id}`, {
          name: name.trim(), description: description.trim(),
        });
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); window.location.reload(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Хадгалж чадсангүй");
    } finally { setSaving(false); }
  };

  // ── Invite user by username ────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true); setInviteResult(null);
    try {
      const res = await api.post(`/workspaces/${workspaceId || workspace?.id}/invite-user`, {
        username: inviteUsername.trim(),
      });
      setInviteResult({ ok: true, message: res.data.message, user: res.data.data });
      setInvitedUsers(p => [...p, res.data.data]);
      setInviteUsername("");
    } catch (err) {
      setInviteResult({ ok: false, message: err.response?.data?.message || "Алдаа гарлаа" });
    } finally { setInviting(false); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${workspace?.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TABS = [
    { id: "general", label: "Тохиргоо" },
    { id: "invite",  label: "Урилга" },
    { id: "roles",   label: "Roles" },
    { id: "members", label: "Members" },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: isDark ? "rgba(8,11,42,.75)" : "rgba(8,11,42,.4)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn .15s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        maxHeight: "90vh",
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: 20, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: P.shadow,
        animation: "fadeUp .25s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Workspace mini avatar */}
            <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarPreview ? "transparent" : grad, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : workspace?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: P.text, margin: 0 }}>{workspace?.name}</h2>
              <p style={{ fontSize: 11, color: P.muted, margin: 0 }}>Workspace тохиргоо</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: isDark ? "rgba(107,115,153,.15)" : "rgba(27,48,102,.06)", border: "none", cursor: "pointer", color: P.muted, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.15)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,.15)" : "rgba(27,48,102,.06)"; e.currentTarget.style.color = P.muted; }}>
            <i className="fa-solid fa-xmark" style={{fontSize:14}}></i>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${P.border}`, padding: "0 20px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 14px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              color: tab === t.id ? P.text : P.muted,
              borderBottom: tab === t.id ? `2px solid ${isDark ? "#6B7399" : "#151d4a"}` : "2px solid transparent",
              marginBottom: -1, transition: "all .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: General settings ── */}
        {tab === "general" && (
          <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Avatar picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: avatarPreview ? "transparent" : grad, border: `2px solid ${P.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(8,11,42,.2)" }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F5" }}>{workspace?.name?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(8,11,42,.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <i className="fa-solid fa-camera" style={{fontSize:20}}></i>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 4 }}>Workspace зураг</p>
                <p style={{ fontSize: 11, color: P.muted, lineHeight: 1.5 }}>Зураг дарж өөрчлөх<br />PNG, JPG дэмжинэ</p>
              </div>
            </div>

            {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={labelSt}>Нэр</label>
              <input style={inputSt} value={name} onChange={e => setName(e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Workspace нэр" />
            </div>
            <div>
              <label style={labelSt}>Тайлбар</label>
              <input style={inputSt} value={description} onChange={e => setDesc(e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Заавал биш" />
            </div>

            {/* Invite link */}
            <div>
              <label style={labelSt}>Урилгын холбоос</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: P.inputBg, fontSize: 11, color: P.muted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-link" style={{fontSize:10, flexShrink:0, color:"#6B7399"}}></i>
                  {`${window.location.origin}/invite/${workspace?.inviteCode}`}
                </div>
                <button type="button" onClick={copyLink} style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: copied ? "rgba(34,197,94,.15)" : isDark ? "rgba(27,48,102,.4)" : "rgba(27,48,102,.1)", border: copied ? "1px solid rgba(34,197,94,.3)" : `1px solid ${P.bd2}`, color: copied ? "#4ade80" : P.text2, fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {copied ? <i className="fa-solid fa-check" style={{fontSize:13}}></i> : <i className="fa-solid fa-copy" style={{fontSize:13}}></i>}
                  {copied ? "Хуулсан!" : "Хуулах"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: P.muted, marginTop: 5 }}>Энэ холбоосыг хуваалцсанаар хэн ч workspace-д нэгдэх боломжтой.</p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: "11px", borderRadius: 10, border: saved ? "1px solid rgba(34,197,94,.3)" : "none", background: saved ? "rgba(34,197,94,.15)" : "linear-gradient(135deg,#1B3066,#2a4080)", color: saved ? "#4ade80" : "#F0F0F5", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1, transition: "all .2s", boxShadow: saved ? "none" : "0 4px 14px rgba(27,48,102,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onMouseEnter={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#2a4080,#6B7399)"; } }}
                onMouseLeave={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#1B3066,#2a4080)"; } }}>
                {saved ? <><i className="fa-solid fa-check" style={{fontSize:14}}></i> Хадгаллаа!</> : saving ? "Хадгалж байна…" : "Хадгалах"}
              </button>
              <button type="button" disabled={deleting} onClick={async () => {
                const confirmed = window.prompt(`Устгахдаа итгэлтэй байвал "${workspace?.name}" гэж бичнэ үү:`);
                if (confirmed !== workspace?.name) { if (confirmed !== null) alert("Нэр буруу байна"); return; }
                setDeleting(true);
                try {
                  await api.delete(`/workspaces/${workspaceId || workspace?.id}`);
                  onClose(); navigate("/dashboard"); window.location.reload();
                } catch (err) { alert(err.response?.data?.message || "Алдаа гарлаа"); }
                finally { setDeleting(false); }
              }} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", transition: "all .15s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#dc2626"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,.3)"; }}>
                {deleting ? "Устгаж байна…" : "🗑 Устгах"}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Invite user ── */}
        {tab === "invite" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: P.muted, margin: 0, lineHeight: 1.6 }}>
              Хэрэглэгчийн нэрийг оруулж workspace-д шууд нэмэх боломжтой.
            </p>

            <form onSubmit={handleInvite} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fa-solid fa-magnifying-glass" style={{
                  fontSize: 12, position: "absolute", left: 10,
                  color: P.muted, pointerEvents: "none", zIndex: 1,
                }}></i>
                <input
                  style={{ ...inputSt, paddingLeft: 30 }}
                  value={inviteUsername}
                  onChange={e => { setInviteUsername(e.target.value); setInviteResult(null); }}
                  onFocus={onFocus} onBlur={onBlur}
                  placeholder="Хэрэглэгчийн нэр…"
                  autoComplete="off"
                />
              </div>
              <button type="submit" disabled={inviting || !inviteUsername.trim()} style={{
                padding: "9px 14px", borderRadius: 10, border: "none",
                cursor: inviting || !inviteUsername.trim() ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg,#151d4a,#1e2d6a)",
                color: "#F0F0F5", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
                flexShrink: 0, whiteSpace: "nowrap",
                opacity: inviting || !inviteUsername.trim() ? .5 : 1,
                transition: "all .15s",
              }}>
                {inviting
                  ? <i className="fa-solid fa-spinner" style={{fontSize:11, animation:"spin 1s linear infinite"}}></i>
                  : <i className="fa-solid fa-user-plus" style={{fontSize:11}}></i>}
                Нэмэх
              </button>
            </form>

            {/* Result message */}
            {inviteResult && (
              <div style={{ padding: "10px 14px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: inviteResult.ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${inviteResult.ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}` }}>
                {inviteResult.ok && inviteResult.user?.avatar && (
                  <img src={API_BASE + inviteResult.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                )}
                <span style={{ fontSize: 13, color: inviteResult.ok ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                  {inviteResult.ok ? "✅ " : "❌ "}{inviteResult.message}
                </span>
              </div>
            )}

            {/* Invited this session */}
            {invitedUsers.length > 0 && (
              <div>
                <label style={labelSt}>Энэ session-д нэмсэн</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {invitedUsers.map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: P.bg2, border: `1px solid ${P.border}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `hsl(${(u.username?.charCodeAt(0)||0)*37%360},40%,28%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#F0F0F5", flexShrink: 0 }}>
                        {u.avatar
                          ? <img src={API_BASE + u.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          : u.username?.[0]?.toUpperCase()
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{u.username}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ade80" }}>✓ Нэмэгдлээ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite link shortcut */}
            <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
              <label style={labelSt}>Холбоосоор урих</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: P.inputBg, fontSize: 11, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-link" style={{fontSize:10, flexShrink:0}}></i>
                  {`${window.location.origin}/invite/${workspace?.inviteCode}`}
                </div>
                <button type="button" onClick={copyLink} style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: copied ? "rgba(34,197,94,.15)" : isDark ? "rgba(27,48,102,.4)" : "rgba(27,48,102,.1)", border: copied ? "1px solid rgba(34,197,94,.3)" : `1px solid ${P.bd2}`, color: copied ? "#4ade80" : P.text2, fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {copied ? <i className="fa-solid fa-check" style={{fontSize:13}}></i> : <i className="fa-solid fa-copy" style={{fontSize:13}}></i>}
                  {copied ? "Хуулсан!" : "Хуулах"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Roles ── */}
        {tab === "roles" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Role list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              {myRole !== "OWNER" && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", fontSize: 12, color: "#f87171", marginBottom: 8 }}>
                  Зөвхөн server owner roles удирдах эрхтэй.
                </div>
              )}
              {roles.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: P.muted, fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏷️</div>
                  Roles байхгүй байна
                </div>
              )}
              {roles.map(role => (
                <div key={role.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: P.bg2, border: `1px solid ${P.border}`,
                  transition: "border-color .15s",
                }}>
                  {editingRole?.id === role.id ? (
                    <>
                      <input type="color" value={editingRole.color}
                        onChange={e => setEditingRole(p => ({ ...p, color: e.target.value }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "none", padding: 2, cursor: "pointer", background: "none", flexShrink: 0 }} />
                      <input value={editingRole.name}
                        onChange={e => setEditingRole(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={async e => {
                          if (e.key === "Enter") {
                            const wsId = workspaceId || workspace?.id;
                            await api.patch(`/workspaces/${wsId}/roles/${role.id}`, { name: editingRole.name, color: editingRole.color });
                            setRoles(p => p.map(r => r.id === role.id ? { ...r, ...editingRole } : r));
                            setEditingRole(null);
                          }
                          if (e.key === "Escape") setEditingRole(null);
                        }}
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text, fontSize: 13, outline: "none", fontWeight: 600 }}
                        autoFocus />
                      <button onClick={async () => {
                        const wsId = workspaceId || workspace?.id;
                        await api.patch(`/workspaces/${wsId}/roles/${role.id}`, { name: editingRole.name, color: editingRole.color });
                        setRoles(p => p.map(r => r.id === role.id ? { ...r, ...editingRole } : r));
                        setEditingRole(null);
                      }} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1B3066,#2a4080)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Save</button>
                      <button onClick={() => setEditingRole(null)} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${P.border}`, background: "transparent", color: P.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: role.color, flexShrink: 0, boxShadow: `0 0 6px ${role.color}66` }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: role.color }}>{role.name}</span>
                      <span style={{ fontSize: 11, color: P.muted, marginRight: 6 }}>
                        {members.filter(m => m.workspaceRole?.id === role.id).length} members
                      </span>
                      {myRole === "OWNER" && (
                        <>
                          <button onClick={() => setEditingRole({ id: role.id, name: role.name, color: role.color })}
                            style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${P.border}`, background: "transparent", color: P.text3, fontSize: 11, cursor: "pointer" }}>Edit</button>
                          <button onClick={async () => {
                            const wsId = workspaceId || workspace?.id;
                            await api.delete(`/workspaces/${wsId}/roles/${role.id}`);
                            setRoles(p => p.filter(r => r.id !== role.id));
                          }} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(239,68,68,.25)", background: "transparent", color: "#f87171", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add role — OWNER only */}
            {myRole === "OWNER" && (
              <div style={{ padding: "14px 20px", borderTop: `1px solid ${P.border}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)}
                    style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${P.border}`, padding: 3, cursor: "pointer", background: "none", flexShrink: 0 }} />
                  <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                    placeholder="Role нэр оруулах…"
                    onKeyDown={async e => {
                      if (e.key !== "Enter" || !newRoleName.trim()) return;
                      const wsId = workspaceId || workspace?.id;
                      const res = await api.post(`/workspaces/${wsId}/roles`, { name: newRoleName.trim(), color: newRoleColor });
                      setRoles(p => [...p, res.data.data]);
                      setNewRoleName(""); setNewRoleColor("#6B7399");
                    }}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text, fontSize: 13, outline: "none" }} />
                  <button onClick={async () => {
                    if (!newRoleName.trim()) return;
                    const wsId = workspaceId || workspace?.id;
                    const res = await api.post(`/workspaces/${wsId}/roles`, { name: newRoleName.trim(), color: newRoleColor });
                    setRoles(p => [...p, res.data.data]);
                    setNewRoleName(""); setNewRoleColor("#6B7399");
                  }} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1B3066,#2a4080)", color: "#F0F0F5", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Members ── */}
        {tab === "members" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              {myRole !== "OWNER" && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", fontSize: 12, color: "#f87171", marginBottom: 4 }}>
                  Зөвхөн server owner role оноох эрхтэй.
                </div>
              )}
              {members.filter(m => m.role !== "OWNER").length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: P.muted, fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                  Гишүүд байхгүй
                </div>
              )}
              {members.filter(m => m.role !== "OWNER").map(member => {
                const gradients = ["linear-gradient(135deg,#3b82f6,#6366f1)","linear-gradient(135deg,#8b5cf6,#ec4899)","linear-gradient(135deg,#06b6d4,#3b82f6)","linear-gradient(135deg,#10b981,#06b6d4)","linear-gradient(135deg,#f59e0b,#ef4444)"];
                const grad = gradients[member.username?.charCodeAt(0) % gradients.length];
                return (
                  <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: P.bg2, border: `1px solid ${P.border}` }}>
                    {member.avatar
                      ? <img src={member.avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 34, height: 34, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{member.username?.[0]?.toUpperCase()}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.username}</div>
                      {member.workspaceRole
                        ? <div style={{ fontSize: 11, color: member.workspaceRole.color, fontWeight: 600 }}>{member.workspaceRole.name}</div>
                        : <div style={{ fontSize: 11, color: P.muted }}>No role</div>
                      }
                    </div>
                    {myRole === "OWNER" && (
                      <select
                        value={member.workspaceRole?.id || ""}
                        onChange={async e => {
                          const wsId = workspaceId || workspace?.id;
                          const roleId = e.target.value || null;
                          await api.patch(`/workspaces/${wsId}/members/${member.id}/role`, { roleId });
                          setMembers(p => p.map(m => m.id === member.id
                            ? { ...m, workspaceRole: roles.find(r => r.id === roleId) || null }
                            : m
                          ));
                        }}
                        style={{ padding: "6px 10px", borderRadius: 9, border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text, fontSize: 12, cursor: "pointer", outline: "none", maxWidth: 120 }}
                      >
                        <option value="">No role</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
