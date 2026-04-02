import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { CallProvider } from "./context/CallContext.jsx";
import { PipProvider } from "./context/PipContext.jsx";
import { WebRTCProvider } from "./context/WebRTCContext.jsx";
import GlobalPip from "./components/ui/GlobalPip.jsx";
import usePushNotifications from "./hooks/usePushNotifications.js";
import ToastContainer from "./components/ui/ToastContainer.jsx";
import CallToastManager from "./components/ui/CallToastManager.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DMPage from "./pages/DMPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import BannedMembersPage from "./pages/BannedMembersPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#080B2A" }}>
    <svg style={{ animation: "spin 1s linear infinite", width: 32, height: 32, color: "#6B7399" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0110 10"/>
    </svg>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  return !user ? children : <Navigate to="/dashboard" />;
};

const PushNotificationHandler = () => { usePushNotifications(); return null; };

const AppRoutes = () => (
  <Routes>
    <Route path="/"                             element={<Navigate to="/dashboard" />} />
    <Route path="/login"                        element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register"                     element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/dashboard"                    element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
    <Route path="/chat/:workspaceId/:channelId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
    <Route path="/dm/:userId"                   element={<PrivateRoute><DMPage /></PrivateRoute>} />
    <Route path="/call/:userId"                 element={<PrivateRoute><CallPage /></PrivateRoute>} />
    <Route path="/invite/:code"                 element={<InvitePage />} />
    <Route path="/profile"                      element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
    <Route path="/friends"                      element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
    <Route path="/bans/:workspaceId"            element={<PrivateRoute><BannedMembersPage /></PrivateRoute>} />
    <Route path="/forgot-password"              element={<ForgotPasswordPage />} />
    <Route path="/reset-password"               element={<ResetPasswordPage />} />
    <Route path="/profile/:id" element={<ProfilePage />} />
  </Routes>
);

const App = () => (
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <WebRTCProvider>
            <CallProvider>
              <PipProvider>
                <NotificationProvider>
                  <PushNotificationHandler />
                  <ToastContainer />
                  <CallToastManager />
                  <GlobalPip />
                  <AppRoutes />
                </NotificationProvider>
              </PipProvider>
            </CallProvider>
            </WebRTCProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
);

export default App;
