import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Conversation } from "@/types";
import { Avatar } from "@/components/Avatar";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const colors = isDark ? Colors.dark : Colors.light;

  const {
    data: conversations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return "No messages yet";
    
    const msg = conversation.lastMessage;
    if (msg.type === "image") {
      return "Photo";
    }
    
    if (msg.expiryType === "view_once" && !msg.isViewed && msg.senderId !== user?.id) {
      return "View once photo";
    }
    
    return msg.content || "";
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [
        styles.conversationItem,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.backgroundSecondary, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() =>
        navigation.navigate("Chat", {
          conversationId: item.id,
          otherUser: item.otherUser,
        })
      }
    >
      <Avatar name={item.otherUser.displayName} size={52} isOnline={item.otherUser.isOnline} />
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <ThemedText style={styles.userName} numberOfLines={1}>
            {item.otherUser.displayName}
          </ThemedText>
          <ThemedText style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(item.lastMessageAt)}
          </ThemedText>
        </View>
        <View style={styles.messagePreviewRow}>
          {item.lastMessage?.expiryType !== "permanent" && item.lastMessage ? (
            <Feather
              name="clock"
              size={12}
              color={colors.danger}
              style={styles.timerIcon}
            />
          ) : null}
          <ThemedText
            style={[styles.messagePreview, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {getMessagePreview(item)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="message-circle" size={64} color={colors.textSecondary} />
      <ThemedText style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        No conversations yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start a new chat to begin messaging
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.md,
            backgroundColor: colors.backgroundDefault,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.headerLogo}
            />
            <ThemedText style={styles.headerTitle}>Cleaner Phone</ThemedText>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.headerButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("NewChat")}
            >
              <Feather name="edit" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Profile")}
            >
              <Feather name="user" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
          conversations.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  conversationContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    ...Typography.body,
    fontWeight: "600",
    flex: 1,
    marginRight: Spacing.sm,
  },
  time: {
    ...Typography.caption,
  },
  messagePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerIcon: {
    marginRight: Spacing.xs,
  },
  messagePreview: {
    ...Typography.small,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
});
