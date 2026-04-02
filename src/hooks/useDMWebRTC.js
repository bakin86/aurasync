import { useRef, useState, useEffect } from "react";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export default function useDMWebRTC(socket, targetUserId) {
  const [inCall,       setInCall]       = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCameraOff,  setIsCameraOff]  = useState(false);
  const [callStatus,   setCallStatus]   = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [withVideo,    setWithVideo]    = useState(false);

  const pcRef          = useRef(null);
  const localStream    = useRef(null);
  const remoteSocket   = useRef(null);
  const iceBuf         = useRef([]);
  const hasRemote      = useRef(false);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const attach = (ref, stream) => {
    if (!ref?.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  };

  const flushIce = async () => {
    for (const c of iceBuf.current) {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceBuf.current = [];
  };

  const buildPC = (stream) => {
    pcRef.current?.close();
    pcRef.current = null;
    hasRemote.current = false;
    iceBuf.current = [];

    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && remoteSocket.current)
        socket.emit("dm_call_ice_candidate", { candidate: candidate.toJSON(), toSocketId: remoteSocket.current });
    };

    pc.oniceconnectionstatechange = () => console.log("[DM-WebRTC] ICE:", pc.iceConnectionState);

    pc.ontrack = ({ track, streams }) => {
      const s = streams[0]; if (!s) return;
      attach(remoteAudioRef, s);
      if (track.kind === "video") attach(remoteVideoRef, s);
    };

    pcRef.current = pc;
    return pc;
  };

  const getMedia = async (wantVideo) => {
    // Always try audio first; add video separately to handle camera-busy gracefully
    if (!wantVideo) {
      return {
        stream: await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        }),
        hasVideo: false,
      };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      return { stream, hasVideo: true };
    } catch {
      // Camera failed — fall back to audio only
      console.warn("[DM-WebRTC] Camera failed, falling back to audio");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      return { stream, hasVideo: false };
    }
  };

  const startCall = async (video = false) => {
    try {
      const { stream, hasVideo } = await getMedia(video);
      localStream.current = stream;
      setWithVideo(hasVideo);
      attach(localVideoRef, stream);

      const pc = buildPC(stream);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: hasVideo });
      await pc.setLocalDescription(offer);

      socket.emit("dm_call_offer", {
        offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
        toUserId: targetUserId,
        withVideo: hasVideo,
      });
      setCallStatus("calling");
      setInCall(true);
    } catch (err) {
      console.error("[DM-WebRTC] startCall:", err);
      if (err.name === "NotAllowedError") alert("Микрофон/камерт зөвшөөрөл олгоно уу.");
      else if (err.name === "NotFoundError") alert("Микрофон олдсонгүй.");
      else alert("Дуудлага эхлүүлж чадсангүй:\n" + err.message);
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    try {
      const wantVideo = !!incomingCall.withVideo;
      const { stream, hasVideo } = await getMedia(wantVideo);
      localStream.current = stream;
      setWithVideo(hasVideo);
      attach(localVideoRef, stream);

      const pc = buildPC(stream);
      remoteSocket.current = incomingCall.fromSocketId;

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: incomingCall.offer.type,
        sdp:  incomingCall.offer.sdp,
      }));
      hasRemote.current = true;
      await flushIce();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("dm_call_answer", {
        answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
        toSocketId: incomingCall.fromSocketId,
      });

      setIncomingCall(null);
      setCallStatus("active");
      setInCall(true);
    } catch (err) {
      console.error("[DM-WebRTC] answerCall:", err);
      if (err.name === "NotAllowedError") alert("Микрофон/камерт зөвшөөрөл олгоно уу.");
      else alert("Хариулж чадсангүй:\n" + err.message);
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket.emit("dm_call_end", { toUserId: incomingCall.fromUserId });
    setIncomingCall(null);
  };

  const cleanUp = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    pcRef.current?.close(); pcRef.current = null;
    remoteSocket.current = null;
    hasRemote.current = false; iceBuf.current = [];
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  const endCall = () => {
    cleanUp();
    socket?.emit("dm_call_end", { toUserId: targetUserId });
    setInCall(false); setIsMuted(false); setIsCameraOff(false);
    setCallStatus(null); setWithVideo(false);
  };

  const toggleMute = () => {
    const t = localStream.current?.getAudioTracks()[0];
    if (!t) return; t.enabled = !t.enabled; setIsMuted(!t.enabled);
  };

  const toggleCamera = () => {
    const t = localStream.current?.getVideoTracks()[0];
    if (!t) return; t.enabled = !t.enabled; setIsCameraOff(!t.enabled);
  };

  useEffect(() => {
    if (!socket) return;

    const onOffer = (data) => {
      if (!data?.offer?.type || !data?.offer?.sdp) { console.error("[DM-WebRTC] bad offer"); return; }
      setIncomingCall(data);
    };

    const onAnswer = async ({ answer, fromSocketId }) => {
      if (!pcRef.current || !answer?.type) return;
      try {
        remoteSocket.current = fromSocketId;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        hasRemote.current = true;
        await flushIce();
        setCallStatus("active");
      } catch (e) { console.error("[DM-WebRTC] answer:", e); }
    };

    const onIce = async ({ candidate }) => {
      if (!candidate) return;
      if (!pcRef.current || !hasRemote.current) { iceBuf.current.push(candidate); return; }
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("[DM-WebRTC] ice:", e.message); }
    };

    const onEnded = () => {
      cleanUp();
      setInCall(false); setIsMuted(false); setIsCameraOff(false);
      setCallStatus(null); setWithVideo(false);
    };

    socket.on("dm_call_offer",          onOffer);
    socket.on("dm_call_answer",         onAnswer);
    socket.on("dm_call_ice_candidate",  onIce);
    socket.on("dm_call_ended",          onEnded);
    return () => {
      socket.off("dm_call_offer",         onOffer);
      socket.off("dm_call_answer",        onAnswer);
      socket.off("dm_call_ice_candidate", onIce);
      socket.off("dm_call_ended",         onEnded);
    };
  }, [socket]);

  useEffect(() => () => cleanUp(), []);

  return {
    inCall, isMuted, isCameraOff, callStatus, incomingCall, withVideo,
    localVideoRef, remoteVideoRef, remoteAudioRef,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleCamera,
  };
}
