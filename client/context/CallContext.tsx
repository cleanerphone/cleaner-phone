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
};

type CallContextType = {
  callState: CallState;
  initiateCall: (receiverId: string, receiverName: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
};

const initialCallState: CallState = {
  callId: null,
  isInCall: false,
  isCalling: false,
  isReceivingCall: false,
  remoteUserId: null,
  remoteUserName: null,
  callDuration: 0,
};

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket, emit, isConnected } = useSocket();
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopAudioStreaming = useCallback(async () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        console.error("Error stopping recording:", e);
      }
      recordingRef.current = null;
    }
  }, []);

  const startAudioStreaming = useCallback(async () => {
    if (Platform.OS === "web") {
      console.log("Audio streaming not available on web");
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
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      audioIntervalRef.current = setInterval(() => {
        if (callState.callId && callState.remoteUserId && socket) {
          socket.emit("call_audio", {
            callId: callState.callId,
            senderId: user?.id,
            receiverId: callState.remoteUserId,
            audioData: "streaming",
          });
        }
      }, 500);

      durationIntervalRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
    } catch (error) {
      console.error("Error starting audio streaming:", error);
    }
  }, [callState.callId, callState.remoteUserId, socket, user?.id]);

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
    if (!callState.callId) return;

    emit("call_accept", {
      callId: callState.callId,
      receiverId: user?.id,
    });

    setCallState((prev) => ({
      ...prev,
      isReceivingCall: false,
      isInCall: true,
      callDuration: 0,
    }));

    await startAudioStreaming();
  }, [callState.callId, emit, user?.id, startAudioStreaming]);

  const rejectCall = useCallback(() => {
    if (!callState.callId) return;

    emit("call_reject", {
      callId: callState.callId,
      receiverId: user?.id,
    });

    setCallState(initialCallState);
  }, [callState.callId, emit, user?.id]);

  const endCall = useCallback(async () => {
    if (!callState.callId) return;

    emit("call_end", {
      callId: callState.callId,
      endedBy: user?.id,
    });

    await stopAudioStreaming();
    setCallState(initialCallState);
  }, [callState.callId, emit, user?.id, stopAudioStreaming]);

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
      setCallState((prev) => ({
        ...prev,
        callId: data.callId,
        isCalling: false,
        isInCall: true,
        callDuration: 0,
      }));
      await startAudioStreaming();
    };

    const handleCallRejected = () => {
      Alert.alert("Call Rejected", "The other user rejected your call");
      stopAudioStreaming();
      setCallState(initialCallState);
    };

    const handleCallEnded = () => {
      stopAudioStreaming();
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

  return (
    <CallContext.Provider
      value={{
        callState,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
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
