import { useRef, useCallback, useEffect } from "react";
import { usePip } from "../../context/PipContext.jsx";

const VideoEl = ({ stream, muted, mirror }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream || null;
    if (stream) ref.current.play().catch(() => {});
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted} style={{
      width: "100%", height: "100%", objectFit: "cover",
      transform: mirror ? "scaleX(-1)" : "none",
      background: "#040612",
    }} />
  );
};

function Btn({ onClick, bg, children, top, bottom, left, right }) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: "absolute",
        top, bottom, left, right,
        width: 28, height: 28, borderRadius: "50%",
        background: bg, border: "1px solid rgba(255,255,255,0.18)",
        color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

export default function GlobalPip() {
  const { pipActive, pipPos, setPipPos, tick, getLive, hidePip } = usePip();
  const dragging   = useRef(false);
  const offset     = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    dragging.current = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    offset.current = { x: cx - pipPos.x, y: cy - pipPos.y };
    e.preventDefault();
  }, [pipPos]);

  useEffect(() => {
    const PW = 160, PH = 120;
    const onMove = (e) => {
      if (!dragging.current) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setPipPos({
        x: Math.max(8, Math.min(window.innerWidth  - PW - 8, cx - offset.current.x)),
        y: Math.max(8, Math.min(window.innerHeight - PH - 72, cy - offset.current.y)),
      });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const maxX = window.innerWidth - PW - 8;
      setPipPos(prev => ({
        x: prev.x + PW / 2 < window.innerWidth / 2 ? 8 : maxX,
        y: prev.y,
      }));
    };
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("touchmove",  onMove, { passive: false });
    window.addEventListener("touchend",   onUp);
    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onUp);
    };
  }, [setPipPos]);

  if (!pipActive) return null;

  const d = getLive();
  const snappedLeft = pipPos.x < 30;

  return (
    <div
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      style={{
        position: "fixed",
        left: pipPos.x, top: pipPos.y,
        width: 160, height: 120,
        zIndex: 9999, borderRadius: 16, overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,255,255,0.12)",
        cursor: "grab", userSelect: "none", touchAction: "none",
        background: "#040612",
        transition: dragging.current ? "none" : "left 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {d.localStream && !d.isCameraOff
        ? <VideoEl stream={d.localStream} muted mirror />
        : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#0a0f2e,#040612)",
          }}>
            <i className="fa-solid fa-microphone" style={{ fontSize: 30, color: "rgba(255,255,255,0.35)" }}></i>
          </div>
        )
      }

      {/* Expand top-left */}
      <Btn top={6} left={6} bg="rgba(0,0,0,0.65)"
        onClick={() => { hidePip(); window.dispatchEvent(new CustomEvent("pip-expand")); }}>
        <i className="fa-solid fa-maximize" style={{ fontSize: 11 }}></i>
      </Btn>

      {/* Leave bottom-right */}
      <Btn bottom={6} right={6} bg="rgba(220,38,38,0.85)"
        onClick={() => { hidePip(); d.onLeave?.(); }}>
        <i className="fa-solid fa-phone-slash" style={{ fontSize: 10 }}></i>
      </Btn>

      {/* Mute bottom-left */}
      <Btn bottom={6} left={6} bg={d.isMuted ? "rgba(220,38,38,0.85)" : "rgba(0,0,0,0.65)"}
        onClick={() => d.onToggleMute?.()}>
        <i className={`fa-solid ${d.isMuted ? "fa-microphone-slash" : "fa-microphone"}`} style={{ fontSize: 10 }}></i>
      </Btn>

      {/* Snap arrow */}
      <div style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        ...(snappedLeft ? { right: 6 } : { left: 6 }),
        color: "rgba(255,255,255,0.4)", fontSize: 10, pointerEvents: "none",
      }}>
        <i className={`fa-solid ${snappedLeft ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
      </div>
    </div>
  );
}
