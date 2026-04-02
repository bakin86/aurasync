import { useRef, useEffect } from "react";

export function useRingtone(playing) {
  const ctx    = useRef(null);
  const timer  = useRef(null);
  const active = useRef(false);

  const ring = () => {
    if (!active.current) return;
    const c = ctx.current;
    if (!c || c.state === "closed") return;

    const now = c.currentTime;
    // Two-tone pattern: 880Hz → 1100Hz × 2, then pause
    [880, 1100, 880, 1100].forEach((freq, i) => {
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.setValueAtTime(0.28, t + 0.10);
      gain.gain.linearRampToValueAtTime(0, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.15);
    });

    timer.current = setTimeout(ring, 2800);
  };

  useEffect(() => {
    if (!playing) {
      active.current = false;
      clearTimeout(timer.current);
      ctx.current?.close().catch(() => {});
      ctx.current = null;
      return;
    }
    try {
      ctx.current  = new (window.AudioContext || window.webkitAudioContext)();
      active.current = true;
      // Resume if suspended (browser policy)
      if (ctx.current.state === "suspended") {
        ctx.current.resume().then(ring);
      } else {
        ring();
      }
    } catch (e) {
      console.warn("[Ringtone]", e.message);
    }
    return () => {
      active.current = false;
      clearTimeout(timer.current);
      ctx.current?.close().catch(() => {});
      ctx.current = null;
    };
  }, [playing]);
}
