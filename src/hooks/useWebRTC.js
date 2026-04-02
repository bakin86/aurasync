import { useRef, useState, useEffect, useCallback } from "react";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export default function useWebRTC(socket, channelId) {
  const [inCall,          setInCall]          = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isCameraOff,     setIsCameraOff]     = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream,     setLocalStream]     = useState(null);
  const [screenStream,    setScreenStream]    = useState(null);
  const [participants,    setParticipants]    = useState([]);

  const localStreamRef  = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef        = useRef({});         // socketId → RTCPeerConnection
  const iceBufRef       = useRef({});         // socketId → ICE[] buffered before remoteDesc

  // ── helpers ────────────────────────────────────────────────────
  const upsert = useCallback((socketId, data) => {
    setParticipants(prev => {
      const idx = prev.findIndex(p => p.socketId === socketId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...data };
        return next;
      }
      return [...prev, { socketId, userId: null, username: "User", stream: null, ...data }];
    });
  }, []);

  const flushIce = async (socketId) => {
    const peer = peersRef.current[socketId];
    if (!peer) return;
    for (const c of iceBufRef.current[socketId] || []) {
      try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceBufRef.current[socketId] = [];
  };

  const buildPeer = useCallback((socketId, stream) => {
    peersRef.current[socketId]?.close();
    iceBufRef.current[socketId] = [];

    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("call_ice_candidate", { candidate: candidate.toJSON(), toSocketId: socketId });
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) upsert(socketId, { stream: streams[0] });
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        pc.close();
        delete peersRef.current[socketId];
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      }
    };

    peersRef.current[socketId] = pc;
    return pc;
  }, [socket, upsert]);

  // ── join / leave ───────────────────────────────────────────────
  const joinCall = async (withVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: withVideo ? { facingMode: "user" } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);
      socket.emit("call_join", { channelId, withVideo });
    } catch (err) {
      console.error("[WebRTC] joinCall:", err);
      if (err.name === "NotAllowedError") alert("Микрофон/камерт зөвшөөрөл олгоно уу.");
      else alert("Дуудлагад нэгдэж чадсангүй: " + err.message);
    }
  };

  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    Object.values(peersRef.current).forEach(p => p.close());
    peersRef.current = {};
    iceBufRef.current = {};
    socket?.emit("call_leave", { channelId });
    setInCall(false); setIsMuted(false); setIsCameraOff(false);
    setIsScreenSharing(false); setLocalStream(null);
    setScreenStream(null); setParticipants([]);
  }, [socket, channelId]);

  // ── controls ───────────────────────────────────────────────────
  const toggleMute = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (!t) return; t.enabled = !t.enabled; setIsMuted(!t.enabled);
  };

  const toggleCamera = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (!t) return; t.enabled = !t.enabled; setIsCameraOff(!t.enabled);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        for (const pc of Object.values(peersRef.current)) {
          const s = pc.getSenders().find(s => s.track?.kind === "video");
          if (s) await s.replaceTrack(camTrack).catch(() => {});
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const scrStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
        screenStreamRef.current = scrStream;
        setScreenStream(scrStream);
        const scrTrack = scrStream.getVideoTracks()[0];
        for (const pc of Object.values(peersRef.current)) {
          const s = pc.getSenders().find(s => s.track?.kind === "video");
          if (s) await s.replaceTrack(scrTrack).catch(() => {});
        }
        scrTrack.onended = () => {
          setIsScreenSharing(false); setScreenStream(null);
          screenStreamRef.current = null;
          const cam = localStreamRef.current?.getVideoTracks()[0];
          if (cam) Object.values(peersRef.current).forEach(pc => {
            pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(cam).catch(() => {});
          });
        };
        setIsScreenSharing(true);
      } catch (err) { console.error("[WebRTC] screen share:", err); }
    }
  };

  // ── socket events ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // New user joined → we send them an offer
    const onJoined = async ({ userId, username, socketId }) => {
      if (!localStreamRef.current) return;
      upsert(socketId, { userId, username, stream: null });
      const pc = buildPeer(socketId, localStreamRef.current);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call_offer", { offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, toSocketId: socketId });
      } catch (e) { console.error("[WebRTC] offer:", e); }
    };

    // Got offer → send answer
    const onOffer = async ({ offer, fromSocketId, username, userId }) => {
      if (!localStreamRef.current) return;
      upsert(fromSocketId, { userId, username, stream: null });
      const pc = buildPeer(fromSocketId, localStreamRef.current);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIce(fromSocketId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call_answer", { answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, toSocketId: fromSocketId });
      } catch (e) { console.error("[WebRTC] answer:", e); }
    };

    // Got answer
    const onAnswer = async ({ answer, fromSocketId, username, userId }) => {
      const pc = peersRef.current[fromSocketId];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIce(fromSocketId);
        if (username) upsert(fromSocketId, { username, userId });
      } catch (e) { console.error("[WebRTC] setAnswer:", e); }
    };

    // ICE candidate
    const onIce = async ({ candidate, fromSocketId }) => {
      if (!candidate) return;
      const pc = peersRef.current[fromSocketId];
      if (!pc || !pc.remoteDescription) {
        iceBufRef.current[fromSocketId] = [...(iceBufRef.current[fromSocketId] || []), candidate];
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("[WebRTC] ice:", e.message); }
    };

    // User left
    const onLeft = ({ userId, username }) => {
      setParticipants(prev => {
        const p = prev.find(p => p.userId === userId);
        if (p) { peersRef.current[p.socketId]?.close(); delete peersRef.current[p.socketId]; }
        return prev.filter(p => p.userId !== userId);
      });
    };

    socket.on("call_user_joined",  onJoined);
    socket.on("call_offer",        onOffer);
    socket.on("call_answer",       onAnswer);
    socket.on("call_ice_candidate",onIce);
    socket.on("call_user_left",    onLeft);

    return () => {
      socket.off("call_user_joined",  onJoined);
      socket.off("call_offer",        onOffer);
      socket.off("call_answer",       onAnswer);
      socket.off("call_ice_candidate",onIce);
      socket.off("call_user_left",    onLeft);
    };
  }, [socket, channelId, buildPeer, upsert]);

  useEffect(() => () => { if (inCall) leaveCall(); }, []);

  return {
    inCall, isMuted, isCameraOff, isScreenSharing,
    localStream, screenStream, participants,
    joinCall, leaveCall, toggleMute, toggleCamera, toggleScreenShare,
  };
}
