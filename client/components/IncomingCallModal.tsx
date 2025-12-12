import React from "react";
import { View, StyleSheet, Modal, Pressable, Vibration, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
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

export function IncomingCallModal() {
  const { callState, acceptCall, rejectCall } = useCall();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (callState.isReceivingCall) {
      pulse.value = withRepeat(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 500, 200, 500], true);
      }
    } else {
      pulse.value = 1;
      if (Platform.OS !== "web") {
        Vibration.cancel();
      }
    }

    return () => {
      if (Platform.OS !== "web") {
        Vibration.cancel();
      }
    };
  }, [callState.isReceivingCall, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!callState.isReceivingCall) return null;

  return (
    <Modal visible={callState.isReceivingCall} transparent animationType="fade">
      <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
        <View style={styles.content}>
          <ThemedText style={styles.callingText}>Panggilan Masuk</ThemedText>

          <Animated.View style={[styles.avatarContainer, pulseStyle]}>
            <Avatar name={callState.remoteUserName || "?"} size={120} />
          </Animated.View>

          <ThemedText style={[styles.callerName, { color: colors.text }]}>
            {callState.remoteUserName || "Unknown"}
          </ThemedText>

          <ThemedText style={[styles.callerLabel, { color: colors.textSecondary }]}>
            ingin menghubungi Anda
          </ThemedText>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.callButton, styles.rejectButton]}
              onPress={rejectCall}
            >
              <Feather name="phone-off" size={32} color="#FFFFFF" />
              <ThemedText style={styles.buttonLabel}>Tolak</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.callButton, styles.acceptButton]}
              onPress={acceptCall}
            >
              <Feather name="phone" size={32} color="#FFFFFF" />
              <ThemedText style={styles.buttonLabel}>Terima</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  callingText: {
    fontSize: Typography.body.fontSize,
    color: "#10b981",
    fontWeight: "600",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    marginBottom: Spacing.xl,
  },
  callerName: {
    fontSize: Typography.h2.fontSize,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  callerLabel: {
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing["3xl"],
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing["4xl"],
  },
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#10b981",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.xs,
    fontWeight: "600",
  },
});
