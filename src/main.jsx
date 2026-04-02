import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Inject Font Awesome CDN
const faLink = document.createElement("link");
faLink.rel = "stylesheet";
faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
document.head.appendChild(faLink);

// Note: StrictMode removed intentionally — it causes WebRTC useEffect to fire twice
// which breaks peer connection initialization
createRoot(document.getElementById("root")).render(<App />);
