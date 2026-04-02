const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");

export const imgUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return API_BASE + path;
};

export { API_BASE };
