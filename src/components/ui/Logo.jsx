import { useTheme } from "../../context/ThemeContext.jsx";

export default function Logo({ size = 40, showText = true }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const ring   = isDark ? "#4d8fff" : "#0f2d6b";
  const inner  = isDark ? "#162a6e" : "#0f2d6b";
  const b1     = isDark ? "#2f5dc4" : "#1e4db7";
  const b2     = isDark ? "#4d8fff" : "#3b6fd4";
  const dot    = isDark ? "#b8d4ff" : "#d4e8ff";
  const wm     = isDark ? "#e4eeff" : "#0f2d6b";
  const sub    = isDark ? "#4d8fff" : "#3b6fd4";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
      {/* Icon */}
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Outer chat bubble ring */}
        <path fill="none" stroke={ring} strokeWidth="10" strokeLinecap="round"
          d="M 50,10 A 40,40 0 1,1 22,68"/>
        {/* Tail */}
        <path fill="none" stroke={ring} strokeWidth="8" strokeLinecap="round"
          d="M 24,66 Q 8,82 12,91"/>
        {/* Inner filled circle */}
        <circle fill={inner} cx="50" cy="48" r="30"/>
        {/* Left bubble */}
        <rect fill={b1} x="24" y="34" width="30" height="18" rx="6"/>
        <polygon fill={b1} points="28,52 22,62 36,52"/>
        {/* Right bubble */}
        <rect fill={b2} x="42" y="46" width="24" height="15" rx="5"/>
        <polygon fill={b2} points="56,61 64,68 50,61"/>
        {/* Dots left */}
        <circle fill={dot} cx="30" cy="43" r="2.2"/>
        <circle fill={dot} cx="37" cy="43" r="2.2"/>
        <circle fill={dot} cx="44" cy="43" r="2.2"/>
        {/* Dots right */}
        <circle fill={dot} cx="48" cy="53.5" r="1.8"/>
        <circle fill={dot} cx="54" cy="53.5" r="1.8"/>
        <circle fill={dot} cx="60" cy="53.5" r="1.8"/>
      </svg>

      {showText && (
        <div style={{ lineHeight: 1.1 }}>
          <div style={{
            fontSize: size * 0.4,
            fontWeight: 700,
            color: wm,
            letterSpacing: size * 0.055,
            fontFamily: "system-ui,-apple-system,sans-serif",
          }}>AURA</div>
          <div style={{
            fontSize: size * 0.155,
            fontWeight: 500,
            color: sub,
            letterSpacing: size * 0.09,
            fontFamily: "system-ui,-apple-system,sans-serif",
          }}>SYNC</div>
        </div>
      )}
    </div>
  );
}
