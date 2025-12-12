import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { ThemedView } from "@/components/ThemedView";
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
  const { callState, endCall } = useCall();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

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

  if (!callState.isCalling && !callState.isInCall) return null;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.content}>
        <ThemedText style={[styles.statusText, { color: callState.isInCall ? colors.success : colors.textSecondary }]}>
          {callState.isCalling ? "Memanggil..." : "Terhubung"}
        </ThemedText>

        <Animated.View style={[styles.avatarContainer, callState.isCalling ? pulseStyle : undefined]}>
          <Avatar name={callState.remoteUserName || "?"} size={140} />
        </Animated.View>

        <ThemedText style={styles.remoteName}>
          {callState.remoteUserName || "Unknown"}
        </ThemedText>

        {callState.isInCall ? (
          <ThemedText style={[styles.duration, { color: colors.textSecondary }]}>
            {formatDuration(callState.callDuration)}
          </ThemedText>
        ) : null}

        {Platform.OS === "web" ? (
          <ThemedText style={[styles.webWarning, { color: colors.danger }]}>
            Voice calling only works on Expo Go (mobile devices)
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <View style={styles.controls}>
          <Pressable style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}>
            <Feather name="mic-off" size={24} color={colors.text} />
          </Pressable>

          <Pressable style={[styles.endButton]} onPress={endCall}>
            <Feather name="phone-off" size={32} color="#FFFFFF" />
          </Pressable>

          <Pressable style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}>
            <Feather name="volume-2" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    marginBottom: Spacing.xl,
  },
  remoteName: {
    fontSize: Typography.h2.fontSize,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  duration: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "500",
  },
  webWarning: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  controlsContainer: {
    paddingHorizontal: Spacing["2xl"],
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing["2xl"],
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
});
