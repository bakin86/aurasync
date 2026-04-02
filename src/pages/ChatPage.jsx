import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { usePip } from "../context/PipContext.jsx";
import { useWebRTCContext } from "../context/WebRTCContext.jsx";
import Sidebar from "../components/sidebar/Sidebar.jsx";
import ChatHeader from "../components/chat/ChatHeader.jsx";
import PinnedMessage from "../components/chat/PinnedMessage.jsx";
import MessageList from "../components/chat/MessageList.jsx";
import MessageInput from "../components/chat/MessageInput.jsx";
import MemberList from "../components/chat/MemberList.jsx";
import VideoSidePanel from "../components/ui/VideoSidePanel.jsx";
import SearchModal from "../components/ui/SearchModal.jsx";
import ProfilePage from "./ProfilePage.jsx";

const ChatPage = () => {
  const { workspaceId, channelId } = useParams();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { showPip, hidePip, updateCallState } = usePip();

  const [workspaces, setWorkspaces] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showCall, setShowCall] = useState(true);
  const [members, setMembers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  const currentChannelId = useRef(channelId);

  useEffect(() => {
    const handler = () => setShowProfile(true);
    window.addEventListener("open-profile", handler);
    return () => window.removeEventListener("open-profile", handler);
  }, []);

  const {
    inCall, isMuted, isCameraOff, isScreenSharing,
    localStream, participants,
    joinCall, leaveCall, toggleMute, toggleCamera, toggleScreenShare,
  } = useWebRTCContext();

  useEffect(() => {
    api.get("/workspaces").then((res) => {
      const ws = res.data.data || [];
      setWorkspaces(ws);
      setCurrentWorkspace(ws.find((w) => w.id === workspaceId) || null);
      localStorage.setItem("lastWorkspaceId", workspaceId);
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    api.get(`/channels/workspace/${workspaceId}`).then((res) => {
      const chs = res.data.data || [];
      setChannels(chs);
      setCurrentChannel(chs.find((c) => c.id === channelId) || null);
    });
  }, [workspaceId, channelId]);

  useEffect(() => {
    if (!channelId || channelId === "none") return;
    currentChannelId.current = channelId;
    setMessages([]);
    api.get(`/messages/${channelId}`).then((res) => setMessages(res.data.data || []));
  }, [channelId]);

  useEffect(() => {
    if (!channelId || channelId === "none") return;
    api.get(`/messages/${channelId}/pinned`).then((res) => setPinnedMessages(res.data.data || []));
  }, [channelId]);

  useEffect(() => {
    if (!workspaceId) return;
    api.get(`/workspaces/${workspaceId}/members`).then((res) => setMembers(res.data.data || []));
  }, [workspaceId]);

  useEffect(() => {
    if (!socket || !workspaceId || !channelId) return;
    socket.emit("join_workspace", workspaceId);
    socket.emit("join_channel", channelId);

    const handleNewMessage = (message) => {
      if (message.channelId === currentChannelId.current) setMessages((prev) => [...prev, message]);
    };
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true } : m));
    };
    const handleMessageEdited = ({ message }) => {
      setMessages((prev) => prev.map((m) => m.id === message.id ? message : m));
    };
    const handleMessagePinned = ({ message }) => {
      if (message.pinned) setPinnedMessages((prev) => [message, ...prev.filter((m) => m.id !== message.id)]);
      else setPinnedMessages((prev) => prev.filter((m) => m.id !== message.id));
      setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, pinned: message.pinned } : m));
    };
    const handleUserTyping = ({ username, typing }) => {
      if (username === user?.username) return;
      setTypingUsers((prev) => typing ? [...new Set([...prev, username])] : prev.filter((u) => u !== username));
    };
    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("user_typing", handleUserTyping);
    socket.on("reaction_updated", handleReactionUpdated);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("user_typing", handleUserTyping);
      socket.off("reaction_updated", handleReactionUpdated);
    };
  }, [socket, workspaceId, channelId]);

  const handleSend = async (content, fileUrl, fileType) => {
    try {
      const body = { content, fileUrl, fileType };
      if (replyTo) {
        body.replyTo = { id: replyTo.id, content: replyTo.content, username: replyTo.user?.username };
      }
      const res = await api.post(`/messages/${channelId}`, body);
      socket?.emit("send_message", { ...res.data.data, workspaceId, channelName: currentChannel?.name || channelId });
      setReplyTo(null);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (updatedMessage) => {
    setMessages((prev) => prev.map((m) => m.id === updatedMessage.id ? updatedMessage : m));
  };

  const handleDelete = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true } : m));
      socket?.emit("delete_message", { messageId, channelId });
    } catch (err) { console.error(err); }
  };

  const handlePin = async (message) => {
    try {
      const res = await api.patch(`/messages/${message.id}/pin`);
      const updated = res.data.data;
      if (updated.pinned) setPinnedMessages((prev) => [updated, ...prev.filter((m) => m.id !== updated.id)]);
      else setPinnedMessages((prev) => prev.filter((m) => m.id !== updated.id));
      setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, pinned: updated.pinned } : m));
      socket?.emit("message_pinned", { message: updated, channelId });
    } catch (err) { console.error(err); }
  };

  const handleTyping = (isTyping) => {
    if (!socket || !channelId) return;
    if (isTyping) socket.emit("typing_start", { channelId });
    else socket.emit("typing_stop", { channelId });
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/reactions/${messageId}`, { emoji });
      const reactionsRes = await api.get(`/reactions/${messageId}`);
      const reactions = reactionsRes.data.data;
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
      // Find the message owner for targeted notification
      const reactedMsg = messages.find(m => m.id === messageId);
      socket?.emit("reaction_updated", {
        messageId, channelId, reactions, emoji,
        reactorId: user?.id, reactorName: user?.username,
        messageOwnerId: reactedMsg?.user?.id,
      });
    } catch (err) { console.error(err); }
  };

  const isOwner = members.find((m) => m.id === user?.id)?.role === "OWNER";

  // Mobile PiP: show when call starts, sync state changes, hide when call ends
  const pipShownRef = useRef(false);

  useEffect(() => {
    if (!inCall) {
      pipShownRef.current = false;
      hidePip();
      return;
    }
    if (window.innerWidth > 768) return;

    const state = {
      localStream,
      isMuted,
      isCameraOff,
      onLeave:        leaveCall,
      onToggleMute:   toggleMute,
      onToggleCamera: toggleCamera,
    };

    if (!pipShownRef.current) {
      pipShownRef.current = true;
      showPip(state);
    } else {
      updateCallState(state);
    }
  }, [inCall, localStream, isMuted, isCameraOff]);

  // Re-show PiP when VideoSidePanel fullscreen minimize is pressed on mobile
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth <= 768 && inCall) {
        showPip({
          localStream, isMuted, isCameraOff,
          onLeave: leaveCall, onToggleMute: toggleMute, onToggleCamera: toggleCamera,
        });
      }
    };
    window.addEventListener("pip-show", handler);
    return () => window.removeEventListener("pip-show", handler);
  }, [inCall, localStream, isMuted, isCameraOff]);

  return (
    <div className="chat-page" style={{ display: "flex", background: "var(--bg)", overflow: "hidden", animation: "fadeIn .25s ease both" }}>
      <Sidebar workspaces={workspaces} channels={channels} setChannels={setChannels} currentWorkspace={currentWorkspace} onProfileOpen={() => setShowProfile(true)} />

      <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ChatHeader
            channel={currentChannel}
            onlineCount={onlineUsers.length}
            onToggleMembers={() => setShowMembers((p) => !p)}
            showMembers={showMembers}
            onSearch={() => setShowSearch(true)}
            workspaceId={workspaceId}
            isOwner={isOwner}
            inCall={inCall}
            onJoinAudio={() => joinCall(channelId, false)}
            onJoinVideo={() => joinCall(channelId, true)}
            onLeaveCall={leaveCall}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
          />
          <PinnedMessage messages={pinnedMessages} onUnpin={handlePin} />
          <MessageList
            messages={messages}
            typingUsers={typingUsers}
            onReaction={handleReaction}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPin={handlePin}
            onReply={(msg) => setReplyTo(msg)}
            socket={socket}
            channelId={channelId}
          />
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
            channelName={currentChannel?.name}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>

        {/* Member list */}
        {showMembers && (
          <div className="chat-member-panel">
          <MemberList
            members={members}
            onClose={() => setShowMembers(false)}
            workspaceId={workspaceId}
            onMemberBanned={(bannedId) => setMembers((prev) => prev.filter((m) => m.id !== bannedId))}
          />
          </div>
        )}

        {/* Video/Voice side panel — always visible */}
        {showCall && (
          <div className="chat-video-panel">
          <VideoSidePanel
            inCall={inCall}
            localStream={localStream}
            localUser={user}
            participants={participants}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            onJoinAudio={() => joinCall(channelId, false)}
            onJoinVideo={() => joinCall(channelId, true)}
            onLeave={leaveCall}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onToggleScreen={toggleScreenShare}
          />
          </div>
        )}
      </div>

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} channelId={channelId} />
      )}

      {showProfile && (
        <ProfilePage onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default ChatPage;
