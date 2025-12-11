import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useEncryption } from "@/context/EncryptionContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Message, ExpiryType, EXPIRY_OPTIONS } from "@/types";
import { MessageBubble } from "@/components/MessageBubble";
import { uploadFileToStorage } from "@/utils/objectStorageExpo";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { isReady: encryptionReady, encryptMessage, decryptMessage, getRecipientPublicKey } = useEncryption();
  const queryClient = useQueryClient();
  const colors = isDark ? Colors.dark : Colors.light;
  const flatListRef = useRef<FlatList>(null);

  const { conversationId, otherUser, selectedTimer } = route.params;

  const [messageText, setMessageText] = useState("");
  const [expiryType, setExpiryType] = useState<ExpiryType>("permanent");
  const [isSending, setIsSending] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (encryptionReady && otherUser.id) {
      getRecipientPublicKey(otherUser.id).then(setRecipientPublicKey);
    }
  }, [encryptionReady, otherUser.id, getRecipientPublicKey]);

  useEffect(() => {
    if (selectedTimer) {
      setExpiryType(selectedTimer as ExpiryType);
    }
  }, [selectedTimer]);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      type: "text" | "image";
      content?: string;
      imageUrl?: string;
      expiryType: ExpiryType;
      ciphertext?: string;
      nonce?: string;
      senderPublicKey?: string;
      isEncrypted?: boolean;
    }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const plainText = messageText.trim();
      
      if (encryptionReady && recipientPublicKey) {
        const encrypted = encryptMessage(plainText, recipientPublicKey);
        if (encrypted) {
          await sendMessageMutation.mutateAsync({
            type: "text",
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            senderPublicKey: encrypted.senderPublicKey,
            isEncrypted: true,
            expiryType,
          });
        } else {
          await sendMessageMutation.mutateAsync({
            type: "text",
            content: plainText,
            expiryType,
          });
        }
      } else {
        await sendMessageMutation.mutateAsync({
          type: "text",
          content: plainText,
          expiryType,
        });
      }
      
      setMessageText("");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsSending(true);
      try {
        const file = new File(result.assets[0].uri);
        const uploadUrl = await uploadFileToStorage(file);
        
        const response = await apiRequest("PUT", "/api/images", { imageURL: uploadUrl });
        const { objectPath } = await response.json();

        await sendMessageMutation.mutateAsync({
          type: "image",
          imageUrl: objectPath,
          expiryType,
        });

        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.error("Image upload error:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleTimerPress = () => {
    navigation.navigate("TimerSelector", {
      currentValue: expiryType,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isOwn={item.senderId === user?.id}
    />
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const expiryLabel = EXPIRY_OPTIONS.find((o) => o.value === expiryType)?.label || "Permanent";

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.backgroundDefault,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={28} color={colors.primary} />
        </Pressable>

        <View style={styles.headerInfo}>
          <Avatar name={otherUser.displayName} size={40} isOnline={otherUser.isOnline} />
          <View style={styles.headerText}>
            <ThemedText style={styles.headerName}>{otherUser.displayName}</ThemedText>
            <ThemedText style={[styles.headerStatus, { color: colors.textSecondary }]}>
              {otherUser.isOnline ? "Online" : "Offline"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyMessages}>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                No messages yet. Start the conversation!
              </ThemedText>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            backgroundColor: colors.backgroundDefault,
            borderTopColor: colors.border,
            ...Shadows.inputBar,
          },
        ]}
      >
        {expiryType !== "permanent" ? (
          <View style={[styles.expiryBadge, { backgroundColor: colors.dangerLight }]}>
            <Feather name="clock" size={12} color={colors.danger} />
            <ThemedText style={[styles.expiryText, { color: colors.danger }]}>
              {expiryLabel}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            onPress={handlePickImage}
            disabled={isSending}
          >
            <Feather name="camera" size={22} color={colors.primary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.7 },
              expiryType !== "permanent" && { backgroundColor: colors.dangerLight },
            ]}
            onPress={handleTimerPress}
          >
            <Feather
              name="clock"
              size={22}
              color={expiryType !== "permanent" ? colors.danger : colors.textSecondary}
            />
          </Pressable>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.backgroundSecondary,
                color: theme.text,
              },
            ]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            editable={!isSending}
          />

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
              (!messageText.trim() || isSending) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={18} color="#FFFFFF" />
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  headerText: {
    gap: 2,
  },
  headerName: {
    ...Typography.body,
    fontWeight: "600",
  },
  headerStatus: {
    ...Typography.caption,
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyText: {
    ...Typography.body,
    textAlign: "center",
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  expiryText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
