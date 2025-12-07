import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

interface AvatarProps {
  name: string;
  size?: number;
  isOnline?: boolean;
}

export function Avatar({ name, size = 48, isOnline }: AvatarProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size * 0.4;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ThemedText style={[styles.initials, { fontSize, color: "#FFFFFF" }]}>
          {initials}
        </ThemedText>
      </LinearGradient>
      {isOnline !== undefined ? (
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: isOnline ? colors.success : colors.textSecondary,
              borderColor: colors.backgroundDefault,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    borderWidth: 2,
  },
});
