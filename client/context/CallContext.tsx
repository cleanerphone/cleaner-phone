import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Platform, Alert } from "react-native";
import { Audio } from "expo-av";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

type CallState = {
  callId: string | null;
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  remoteUserId: string | null;
  remoteUserName: string | null;
  callDuration: number;
  isMuted: boolean;
};

type CallContextType = {
  callState: CallState;
  initiateCall: (receiverId: string, receiverName: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
};

const initialCallState: CallState = {
  callId: null,
  isInCall: false,
  isCalling: false,
  isReceivingCall: false,
  remoteUserId: null,
  remoteUserName: null,
  callDuration: 0,
  isMuted: false,
};

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket, emit, isConnected } = useSocket();
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    callIdRef.current = callState.callId;
    remoteUserIdRef.current = callState.remoteUserId;
  }, [callState.callId, callState.remoteUserId]);

  const stopAudioStreaming = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (e) {
        console.log("Recording cleanup:", e);
      }
      recordingRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("Sound cleanup:", e);
      }
      soundRef.current = null;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) {
      console.log("Audio mode reset:", e);
    }
  }, []);

  const startAudioStreaming = useCallback(async (activeCallId: string, activeRemoteUserId: string) => {
    if (Platform.OS === "web") {
      console.log("Audio streaming limited on web - call signaling active");
      durationIntervalRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
      return;
    }

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Microphone permission is required for calls");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      recordingRef.current = recording;

      if (socket) {
        socket.emit("call_audio_active", {
          callId: activeCallId,
          senderId: user?.id,
          receiverId: activeRemoteUserId,
          isActive: true,
        });
      }

      durationIntervalRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
    } catch (error) {
      console.error("Error starting audio streaming:", error);
      durationIntervalRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
    }
  }, [socket, user?.id]);

  const initiateCall = useCallback((receiverId: string, receiverName: string) => {
    if (!isConnected || !user) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    setCallState({
      ...initialCallState,
      isCalling: true,
      remoteUserId: receiverId,
      remoteUserName: receiverName,
    });

    emit("call_initiate", {
      callerId: user.id,
      receiverId,
      callerName: user.displayName,
    });
  }, [isConnected, user, emit]);

  const acceptCall = useCallback(async () => {
    const currentCallId = callIdRef.current;
    const currentRemoteUserId = remoteUserIdRef.current;
    
    if (!currentCallId) return;

    emit("call_accept", {
      callId: currentCallId,
      receiverId: user?.id,
    });

    setCallState((prev) => ({
      ...prev,
      isReceivingCall: false,
      isInCall: true,
      callDuration: 0,
    }));

    if (currentRemoteUserId) {
      await startAudioStreaming(currentCallId, currentRemoteUserId);
    }
  }, [emit, user?.id, startAudioStreaming]);

  const rejectCall = useCallback(() => {
    const currentCallId = callIdRef.current;
    if (!currentCallId) return;

    emit("call_reject", {
      callId: currentCallId,
      receiverId: user?.id,
    });

    setCallState(initialCallState);
  }, [emit, user?.id]);

  const endCall = useCallback(async () => {
    const currentCallId = callIdRef.current;
    if (!currentCallId) return;

    emit("call_end", {
      callId: currentCallId,
      endedBy: user?.id,
    });

    await stopAudioStreaming();
    setCallState(initialCallState);
  }, [emit, user?.id, stopAudioStreaming]);

  const toggleMute = useCallback(async () => {
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.pauseAsync();
          setCallState((prev) => ({ ...prev, isMuted: true }));
        } else {
          await recordingRef.current.startAsync();
          setCallState((prev) => ({ ...prev, isMuted: false }));
        }
      } catch (e) {
        console.log("Mute toggle error:", e);
      }
    } else {
      setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    const handleIncomingCall = (data: { callId: string; callerId: string; callerName: string }) => {
      setCallState({
        ...initialCallState,
        callId: data.callId,
        isReceivingCall: true,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
      });
    };

    const handleCallAccepted = async (data: { callId: string; receiverId: string }) => {
      const remoteId = remoteUserIdRef.current;
      
      setCallState((prev) => ({
        ...prev,
        callId: data.callId,
        isCalling: false,
        isInCall: true,
        callDuration: 0,
      }));
      
      if (remoteId) {
        await startAudioStreaming(data.callId, remoteId);
      }
    };

    const handleCallRejected = async () => {
      Alert.alert("Call Rejected", "The other user rejected your call");
      await stopAudioStreaming();
      setCallState(initialCallState);
    };

    const handleCallEnded = async () => {
      await stopAudioStreaming();
      setCallState(initialCallState);
    };

    const handleCallCreated = (data: { callId: string }) => {
      setCallState((prev) => ({
        ...prev,
        callId: data.callId,
      }));
    };

    socket.on(`incoming_call:${user.id}`, handleIncomingCall);
    socket.on(`call_accepted:${user.id}`, handleCallAccepted);
    socket.on(`call_rejected:${user.id}`, handleCallRejected);
    socket.on(`call_ended:${user.id}`, handleCallEnded);
    socket.on("call_created", handleCallCreated);

    return () => {
      socket.off(`incoming_call:${user.id}`, handleIncomingCall);
      socket.off(`call_accepted:${user.id}`, handleCallAccepted);
      socket.off(`call_rejected:${user.id}`, handleCallRejected);
      socket.off(`call_ended:${user.id}`, handleCallEnded);
      socket.off("call_created", handleCallCreated);
    };
  }, [socket, user, startAudioStreaming, stopAudioStreaming]);

  useEffect(() => {
    return () => {
      stopAudioStreaming();
    };
  }, [stopAudioStreaming]);

  return (
    <CallContext.Provider
      value={{
        callState,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
