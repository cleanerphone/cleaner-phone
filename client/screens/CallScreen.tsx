import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useCall } from "@/context/CallContext";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { Avatar } from "@/components/Avatar";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const { callState, endCall, toggleMute } = useCall();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (callState.isCalling) {
      pulse.value = withRepeat(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [callState.isCalling, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const toggleSpeaker = async () => {
    try {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: !newSpeakerState,
        });
      }
    } catch (error) {
      console.log("Speaker toggle error:", error);
    }
  };

  if (!callState.isCalling && !callState.isInCall) return null;

  return (
    <Modal
      visible={callState.isCalling || callState.isInCall}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#f0f4f8" }]}>
        <View style={[styles.innerContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <View style={styles.content}>
            <ThemedText style={[styles.statusText, { color: callState.isInCall ? "#22c55e" : colors.textSecondary }]}>
              {callState.isCalling ? "Memanggil..." : "Terhubung"}
            </ThemedText>

            <Animated.View style={[styles.avatarContainer, callState.isCalling ? pulseStyle : undefined]}>
              <Avatar name={callState.remoteUserName || "?"} size={140} />
            </Animated.View>

            <ThemedText style={[styles.remoteName, { color: isDark ? "#ffffff" : "#1a1a2e" }]}>
              {callState.remoteUserName || "Unknown"}
            </ThemedText>

            {callState.isInCall ? (
              <ThemedText style={[styles.duration, { color: colors.textSecondary }]}>
                {formatDuration(callState.callDuration)}
              </ThemedText>
            ) : null}

            {Platform.OS === "web" ? (
              <View style={styles.webWarningContainer}>
                <Feather name="info" size={16} color="#f59e0b" />
                <ThemedText style={styles.webWarning}>
                  Panggilan suara hanya berfungsi di Expo Go
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
            <View style={styles.controls}>
              <Pressable 
                style={({ pressed }) => [
                  styles.controlButton, 
                  { 
                    backgroundColor: callState.isMuted ? "#ef4444" : (isDark ? "#374151" : "#e5e7eb"),
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={toggleMute}
              >
                <Feather 
                  name={callState.isMuted ? "mic-off" : "mic"} 
                  size={24} 
                  color={callState.isMuted ? "#ffffff" : (isDark ? "#ffffff" : "#1f2937")} 
                />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.endButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]} 
                onPress={endCall}
              >
                <Feather name="phone-off" size={32} color="#ffffff" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.controlButton, 
                  { 
                    backgroundColor: isSpeakerOn ? "#3b82f6" : (isDark ? "#374151" : "#e5e7eb"),
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={toggleSpeaker}
              >
                <Feather 
                  name={isSpeakerOn ? "volume-2" : "volume-1"} 
                  size={24} 
                  color={isSpeakerOn ? "#ffffff" : (isDark ? "#ffffff" : "#1f2937")} 
                />
              </Pressable>
            </View>

            <View style={styles.labelContainer}>
              <ThemedText style={[styles.buttonLabel, { color: colors.textSecondary }]}>
                {callState.isMuted ? "Unmute" : "Mute"}
              </ThemedText>
              <View style={styles.labelSpacer} />
              <ThemedText style={[styles.buttonLabel, { color: colors.textSecondary }]}>
                {isSpeakerOn ? "Speaker On" : "Speaker"}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    marginBottom: Spacing.xl,
  },
  remoteName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  duration: {
    fontSize: 20,
    fontWeight: "500",
  },
  webWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 8,
  },
  webWarning: {
    fontSize: 14,
    color: "#f59e0b",
  },
  controlsContainer: {
    paddingHorizontal: Spacing["2xl"],
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  endButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: 40,
  },
  buttonLabel: {
    fontSize: 12,
    textAlign: "center",
    width: 60,
  },
  labelSpacer: {
    width: 76,
  },
});
