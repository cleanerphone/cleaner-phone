import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [isRevealed, setIsRevealed] = useState(message.isViewed || isOwn);

  const isViewOnce = message.expiryType === "view_once";
  const isTimed = message.expiryType !== "permanent";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleReveal = async () => {
    if (!isRevealed && !isOwn) {
      try {
        await apiRequest("PUT", `/api/messages/${message.id}/view`);
        setIsRevealed(true);
      } catch (error) {
        console.error("Failed to mark message as viewed:", error);
      }
    }
  };

  const getExpiryLabel = () => {
    switch (message.expiryType) {
      case "view_once":
        return "View Once";
      case "1_minute":
        return "1 min";
      case "1_hour":
        return "1 hour";
      case "24_hours":
        return "24 hours";
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (message.type === "image") {
      const imageUri = message.imageUrl?.startsWith("/")
        ? `${getApiUrl()}${message.imageUrl}`
        : message.imageUrl;

      if (isViewOnce && !isRevealed && !isOwn) {
        return (
          <Pressable
            style={styles.viewOnceContainer}
            onPress={handleReveal}
          >
            <View style={[styles.blurContent, { backgroundColor: colors.backgroundSecondary }]}>
              <Feather name="eye-off" size={32} color={colors.textSecondary} />
              <ThemedText style={[styles.viewOnceText, { color: colors.textSecondary }]}>
                Tap to view
              </ThemedText>
            </View>
          </Pressable>
        );
      }

      return (
        <Pressable onPress={handleReveal}>
          <Image
            source={{ uri: imageUri }}
            style={styles.messageImage}
            contentFit="cover"
          />
        </Pressable>
      );
    }

    if (isViewOnce && !isRevealed && !isOwn) {
      return (
        <Pressable onPress={handleReveal}>
          <View style={styles.viewOnceTextWrapper}>
            <Feather name="eye-off" size={16} color={colors.textSecondary} />
            <ThemedText style={[styles.viewOnceLabel, { color: colors.textSecondary }]}>
              Tap to reveal
            </ThemedText>
          </View>
        </Pressable>
      );
    }

    return (
      <ThemedText
        style={[
          styles.messageText,
          { color: isOwn ? "#FFFFFF" : colors.text },
        ]}
      >
        {message.content}
      </ThemedText>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn
            ? [styles.ownBubble, { backgroundColor: colors.messageSent }, Shadows.small]
            : [styles.otherBubble, { backgroundColor: colors.messageReceived, borderColor: colors.border }],
        ]}
      >
        {renderContent()}

        <View style={styles.metaRow}>
          {isTimed ? (
            <View style={styles.timerBadge}>
              <Feather
                name="clock"
                size={10}
                color={isOwn ? "rgba(255,255,255,0.7)" : colors.danger}
              />
              <ThemedText
                style={[
                  styles.timerText,
                  { color: isOwn ? "rgba(255,255,255,0.7)" : colors.danger },
                ]}
              >
                {getExpiryLabel()}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText
            style={[
              styles.timeText,
              { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary },
            ]}
          >
            {formatTime(message.createdAt)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    maxWidth: "75%",
  },
  ownContainer: {
    alignSelf: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: BorderRadius.message,
    padding: Spacing.md,
    minWidth: 80,
  },
  ownBubble: {},
  otherBubble: {
    borderWidth: 1,
  },
  messageText: {
    ...Typography.body,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.sm,
  },
  viewOnceContainer: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  blurContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  viewOnceText: {
    ...Typography.small,
  },
  viewOnceTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  viewOnceLabel: {
    ...Typography.small,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timerText: {
    fontSize: 10,
  },
  timeText: {
    fontSize: 10,
  },
});
