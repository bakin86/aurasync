import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const Ctx = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const [items, setItems] = useState([]);
  const pendingCalls = useRef({});

  const add = useCallback((n) => {
    setItems(p => [
      { ...n, id: Date.now() + Math.random(), read: false, time: new Date() },
      ...p
    ].slice(0, 50));
  }, []);

  const markRead    = useCallback((id) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setItems(p => p.map(n => ({ ...n, read: true }))), []);
  const clearAll    = useCallback(() => setItems([]), []);
  const unreadCount = items.filter(n => !n.read).length;

  useEffect(() => {
    if (!socket || !user) return;

    // DM message
    const onDM = (msg) => {
      if (msg.senderId === user.id) return;
      if (msg.isCallLog || msg.type === "call_log") return;
      if (window.location.pathname === `/dm/${msg.senderId}`) return;
      add({
        type: "dm",
        title: msg.sender?.username || "Шинэ мессеж",
        message: msg.content ? (msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content) : "📎 Файл",
        avatar: msg.sender?.avatar,
        link: `/dm/${msg.senderId}`,
      });
    };

    // Channel notification — separate event for workspace-level (avoids duplicates)
    const onChannelMsg = (msg) => {
      if (msg.user?.id === user.id) return;
      // Don't notify if currently on that channel
      const path = window.location.pathname;
      if (msg.channelId && path.includes(msg.channelId)) return;

      const isMention = msg.content?.includes(`@${user.username}`);
      add({
        type: isMention ? "mention" : "channel_message",
        title: isMention
          ? `${msg.user?.username} танд дурдсан`
          : `#${msg.channelName || "channel"} — ${msg.user?.username}`,
        message: msg.content ? (msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content) : "📎 Файл",
        avatar: msg.user?.avatar,
        link: msg.channelId ? `/chat/${msg.workspaceId}/${msg.channelId}` : null,
      });
    };

    // Reaction notification — only when someone reacts to MY message
    const onReaction = ({ messageId, reactions, reactorId, reactorName, emoji, messageOwnerId }) => {
      if (!reactorId || reactorId === user.id) return;
      if (!emoji || !reactorName) return;
      // Only notify if the message belongs to current user
      if (messageOwnerId && messageOwnerId !== user.id) return;
      add({
        type: "reaction",
        title: `${reactorName} ${emoji} тавьсан`,
        message: "Таны мессежид реакц нэмлээ",
        link: null,
      });
    };

    const onFriendReq = (req) => add({
      type: "friend_request",
      title: "Найзын хүсэлт",
      message: `${req.sender?.username} танд найзын хүсэлт илгээлээ`,
      avatar: req.sender?.avatar,
      link: "/friends",
    });

    const onFriendAcc = ({ username }) => add({
      type: "friend_accepted",
      title: "Найзын хүсэлт зөвшөөрлөө",
      message: `${username} таны хүсэлтийг хүлээн авлаа`,
      link: "/friends",
    });

    const onCallOffer = (data) => {
      pendingCalls.current[data.fromUserId] = data;
      setTimeout(() => {
        if (pendingCalls.current[data.fromUserId]) {
          add({
            type: "missed_call",
            title: `${data.fromUsername} дуудсан — хариулаагүй`,
            message: data.withVideo ? "📹 Видео дуудлага" : "📞 Дуут дуудлага",
            avatar: data.fromAvatar,
            link: `/dm/${data.fromUserId}`,
          });
          delete pendingCalls.current[data.fromUserId];
        }
      }, 35000);
    };

    const onCallEnded = ({ fromUserId }) => {
      const pending = pendingCalls.current[fromUserId];
      if (pending) {
        delete pendingCalls.current[fromUserId];
        if (!window.location.pathname.startsWith("/call/")) {
          add({
            type: "missed_call",
            title: `${pending.fromUsername} дуудсан — хариулаагүй`,
            message: pending.withVideo ? "📹 Видео дуудлага" : "📞 Дуут дуудлага",
            avatar: pending.fromAvatar,
            link: `/dm/${fromUserId}`,
          });
        }
      }
    };

    const onReactionDirect = ({ reactorName, emoji, reactorId }) => {
      if (!reactorName || !emoji) return;
      if (reactorId && reactorId === user.id) return;
      add({
        type: "reaction",
        title: `${reactorName} ${emoji} тавьсан`,
        message: "Реакц нэмлээ",
        link: null,
      });
    };

    socket.on("dm_new_message",          onDM);
    socket.on("channel_notification",     onChannelMsg);
    socket.on("reaction_notification",   onReactionDirect);
    socket.on("friend_request_received", onFriendReq);
    socket.on("friend_accepted",         onFriendAcc);
    socket.on("dm_call_offer",           onCallOffer);
    socket.on("dm_call_ended",           onCallEnded);

    return () => {
      socket.off("dm_new_message",          onDM);
      socket.off("channel_notification",     onChannelMsg);
      socket.off("reaction_notification",   onReactionDirect);
      socket.off("friend_request_received", onFriendReq);
      socket.off("friend_accepted",         onFriendAcc);
      socket.off("dm_call_offer",           onCallOffer);
      socket.off("dm_call_ended",           onCallEnded);
    };
  }, [socket, user, add]);

  return (
    <Ctx.Provider value={{ notifications: items, unreadCount, markRead, markAllRead, clearAll, addNotification: add }}>
      {children}
    </Ctx.Provider>
  );
};

export const useNotifications = () => useContext(Ctx);
