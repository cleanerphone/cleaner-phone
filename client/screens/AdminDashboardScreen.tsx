import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  companyId: string | null;
  role: "user" | "super_admin";
  isOnline: boolean;
  createdAt: string;
};

type UserLocation = {
  user: {
    id: string;
    displayName: string;
    username: string;
    isOnline: boolean;
  };
  latitude: number | null;
  longitude: number | null;
  lastUpdate: string | null;
};

type AdminConversation = {
  id: string;
  participant1: {
    id: string;
    displayName: string;
    username: string;
    isOnline: boolean;
  };
  participant2: {
    id: string;
    displayName: string;
    username: string;
    isOnline: boolean;
  };
  lastMessage: {
    id: string;
    type: string;
    content: string | null;
    expiryType: string;
    createdAt: string;
    senderId: string;
  } | null;
  messageCount: number;
  createdAt: string;
};

type AdminMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  expiryType: string;
  createdAt: string;
  isViewed: boolean;
};

type TabType = "users" | "locations" | "conversations" | "remote";

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const { logout } = useAuth();
  const { socket, isConnected, emit } = useSocket();
  const queryClient = useQueryClient();
  const colors = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
  const [selectedRemoteUser, setSelectedRemoteUser] = useState<AdminUser | null>(null);
  const [remoteStreamActive, setRemoteStreamActive] = useState<"camera" | "mic" | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    companyId: "",
    role: "user" as "user" | "super_admin",
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<UserLocation[]>({
    queryKey: ["/api/admin/locations"],
    refetchInterval: 10000,
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<AdminConversation[]>({
    queryKey: ["/api/admin/conversations"],
  });

  const { data: conversationMessages = [], isLoading: messagesLoading } = useQuery<AdminMessage[]>({
    queryKey: [`/api/admin/conversations/${selectedConversation?.id}/messages`],
    enabled: !!selectedConversation,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowAddModal(false);
      resetForm();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      resetForm();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      displayName: "",
      companyId: "",
      role: "user",
    });
  };

  const handleRequestCamera = (user: AdminUser, cameraType: "front" | "back" = "front") => {
    if (!isConnected) {
      Alert.alert("Error", "Tidak terhubung ke server");
      return;
    }
    setSelectedRemoteUser(user);
    setRemoteStreamActive("camera");
    emit("admin_request_camera", { userId: user.id, cameraType });
  };

  const handleRequestMicrophone = (user: AdminUser) => {
    if (!isConnected) {
      Alert.alert("Error", "Tidak terhubung ke server");
      return;
    }
    setSelectedRemoteUser(user);
    setRemoteStreamActive("mic");
    emit("admin_request_microphone", { userId: user.id });
  };

  const handleStopRemoteAccess = () => {
    if (selectedRemoteUser) {
      if (remoteStreamActive === "camera") {
        emit("admin_stop_camera", { userId: selectedRemoteUser.id });
      } else if (remoteStreamActive === "mic") {
        emit("admin_stop_microphone", { userId: selectedRemoteUser.id });
      }
    }
    setSelectedRemoteUser(null);
    setRemoteStreamActive(null);
    setLastFrame(null);
  };

  const handleAddUser = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setFormData({
      username: user.username,
      password: "",
      displayName: user.displayName,
      companyId: user.companyId || "",
      role: user.role,
    });
    setEditingUser(user);
  };

  const handleDeleteUser = (user: AdminUser) => {
    Alert.alert(
      "Hapus User",
      `Apakah Anda yakin ingin menghapus ${user.displayName}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => deleteUserMutation.mutate(user.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.username.trim() || !formData.displayName.trim()) {
      Alert.alert("Error", "Username dan nama wajib diisi");
      return;
    }

    if (editingUser) {
      const updateData: Partial<typeof formData> = {
        displayName: formData.displayName,
        companyId: formData.companyId,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      if (!formData.password.trim()) {
        Alert.alert("Error", "Password wajib diisi untuk user baru");
        return;
      }
      createUserMutation.mutate(formData);
    }
  };

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <View style={[styles.userCard, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.userCardHeader}>
        <Avatar name={item.displayName} size={48} isOnline={item.isOnline} />
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
          <ThemedText style={[styles.userUsername, { color: colors.textSecondary }]}>
            @{item.username}
          </ThemedText>
        </View>
        {item.role === "super_admin" ? (
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <ThemedText style={[styles.roleBadgeText, { color: "#FFFFFF" }]}>Admin</ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.userCardActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => handleEditUser(item)}
        >
          <Feather name="edit-2" size={16} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={() => handleDeleteUser(item)}
        >
          <Feather name="trash-2" size={16} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>Hapus</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderLocationItem = ({ item }: { item: UserLocation }) => (
    <View style={[styles.locationCard, { backgroundColor: colors.backgroundSecondary }]}>
      <Avatar name={item.user.displayName} size={40} isOnline={item.user.isOnline} />
      <View style={styles.locationInfo}>
        <ThemedText style={styles.locationName}>{item.user.displayName}</ThemedText>
        <ThemedText style={[styles.locationUsername, { color: colors.textSecondary }]}>
          @{item.user.username}
        </ThemedText>
        {item.latitude && item.longitude ? (
          <ThemedText style={[styles.locationCoords, { color: colors.textSecondary }]}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.locationCoords, { color: colors.textSecondary }]}>
            Lokasi tidak tersedia
          </ThemedText>
        )}
        {item.lastUpdate ? (
          <ThemedText style={[styles.locationTime, { color: colors.textSecondary }]}>
            Update: {new Date(item.lastUpdate).toLocaleString()}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.onlineIndicator, { backgroundColor: item.user.isOnline ? colors.success : colors.textSecondary }]} />
    </View>
  );

  const renderConversationItem = ({ item }: { item: AdminConversation }) => (
    <Pressable 
      style={[styles.conversationCard, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => setSelectedConversation(item)}
    >
      <View style={styles.conversationHeader}>
        <View style={styles.participantsRow}>
          <Avatar name={item.participant1.displayName} size={36} isOnline={item.participant1.isOnline} />
          <Feather name="arrow-right" size={16} color={colors.textSecondary} style={{ marginHorizontal: Spacing.xs }} />
          <Avatar name={item.participant2.displayName} size={36} isOnline={item.participant2.isOnline} />
        </View>
        <View style={[styles.messageCountBadge, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.messageCountText}>{item.messageCount}</ThemedText>
        </View>
      </View>
      <View style={styles.conversationParticipants}>
        <ThemedText style={styles.participantName}>{item.participant1.displayName}</ThemedText>
        <ThemedText style={[styles.participantSeparator, { color: colors.textSecondary }]}> & </ThemedText>
        <ThemedText style={styles.participantName}>{item.participant2.displayName}</ThemedText>
      </View>
      {item.lastMessage ? (
        <ThemedText style={[styles.lastMessagePreview, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.lastMessage.type === "image" ? "[Gambar]" : item.lastMessage.content || "[Pesan kosong]"}
        </ThemedText>
      ) : (
        <ThemedText style={[styles.lastMessagePreview, { color: colors.textSecondary }]}>
          Belum ada pesan
        </ThemedText>
      )}
      <ThemedText style={[styles.conversationDate, { color: colors.textSecondary }]}>
        {new Date(item.createdAt).toLocaleDateString()}
      </ThemedText>
    </Pressable>
  );

  const getSenderName = (senderId: string) => {
    if (!selectedConversation) return "Unknown";
    if (senderId === selectedConversation.participant1.id) return selectedConversation.participant1.displayName;
    if (senderId === selectedConversation.participant2.id) return selectedConversation.participant2.displayName;
    return "Unknown";
  };

  const renderMessagesModal = () => (
    <Modal
      visible={selectedConversation !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectedConversation(null)}
    >
      <View style={[styles.messagesModalContainer, { backgroundColor: colors.backgroundDefault }]}>
        <View style={[styles.messagesModalHeader, { paddingTop: insets.top + Spacing.md, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedConversation(null)} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.messagesModalHeaderInfo}>
            <ThemedText style={styles.messagesModalTitle}>
              {selectedConversation?.participant1.displayName} & {selectedConversation?.participant2.displayName}
            </ThemedText>
            <ThemedText style={[styles.messagesModalSubtitle, { color: colors.textSecondary }]}>
              {conversationMessages.length} pesan
            </ThemedText>
          </View>
        </View>
        
        {messagesLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={conversationMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.messageItem, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.messageHeader}>
                  <ThemedText style={styles.messageSender}>{getSenderName(item.senderId)}</ThemedText>
                  <ThemedText style={[styles.messageTime, { color: colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                {item.type === "image" && item.imageUrl ? (
                  <ThemedText style={[styles.messageContent, { color: colors.primary }]}>
                    [Gambar: {item.imageUrl}]
                  </ThemedText>
                ) : (
                  <ThemedText style={styles.messageContent}>{item.content || "[Pesan kosong]"}</ThemedText>
                )}
                <View style={styles.messageFooter}>
                  <View style={[styles.expiryBadge, { backgroundColor: item.expiryType === "permanent" ? colors.success : colors.secondary }]}>
                    <ThemedText style={styles.expiryBadgeText}>
                      {item.expiryType === "permanent" ? "Permanen" : item.expiryType}
                    </ThemedText>
                  </View>
                  {item.isViewed ? (
                    <Feather name="check-circle" size={14} color={colors.success} />
                  ) : (
                    <Feather name="circle" size={14} color={colors.textSecondary} />
                  )}
                </View>
              </View>
            )}
            contentContainerStyle={[styles.messagesListContent, { paddingBottom: insets.bottom + Spacing.lg }]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={64} color={colors.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Belum ada pesan
                </ThemedText>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );

  const renderUserForm = () => (
    <Modal
      visible={showAddModal || editingUser !== null}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowAddModal(false);
        setEditingUser(null);
        resetForm();
      }}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => {
          setShowAddModal(false);
          setEditingUser(null);
          resetForm();
        }}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.backgroundDefault }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {editingUser ? "Edit User" : "Tambah User Baru"}
            </ThemedText>
            <Pressable
              onPress={() => {
                setShowAddModal(false);
                setEditingUser(null);
                resetForm();
              }}
            >
              <Feather name="x" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Username</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: theme.text }]}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Masukkan username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                editable={!editingUser}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>
                Password {editingUser ? "(kosongkan jika tidak diubah)" : ""}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: theme.text }]}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Masukkan password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Nama Lengkap</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: theme.text }]}
                value={formData.displayName}
                onChangeText={(text) => setFormData({ ...formData, displayName: text })}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Company ID</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: theme.text }]}
                value={formData.companyId}
                onChangeText={(text) => setFormData({ ...formData, companyId: text })}
                placeholder="Masukkan company ID"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Role</ThemedText>
              <View style={styles.roleButtons}>
                <Pressable
                  style={[
                    styles.roleButton,
                    formData.role === "user" && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFormData({ ...formData, role: "user" })}
                >
                  <ThemedText
                    style={[
                      styles.roleButtonText,
                      formData.role === "user" && { color: "#FFFFFF" },
                    ]}
                  >
                    User
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.roleButton,
                    formData.role === "super_admin" && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFormData({ ...formData, role: "super_admin" })}
                >
                  <ThemedText
                    style={[
                      styles.roleButtonText,
                      formData.role === "super_admin" && { color: "#FFFFFF" },
                    ]}
                  >
                    Super Admin
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <Pressable
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={createUserMutation.isPending || updateUserMutation.isPending}
          >
            {createUserMutation.isPending || updateUserMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>
                {editingUser ? "Simpan Perubahan" : "Tambah User"}
              </ThemedText>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
        <Pressable
          style={[styles.logoutButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={logout}
        >
          <Feather name="log-out" size={20} color={colors.danger} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.backgroundDefault }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "users" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("users")}
        >
          <Feather
            name="users"
            size={18}
            color={activeTab === "users" ? "#FFFFFF" : colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "users" && { color: "#FFFFFF" },
            ]}
          >
            Users
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "locations" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("locations")}
        >
          <Feather
            name="map-pin"
            size={18}
            color={activeTab === "locations" ? "#FFFFFF" : colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "locations" && { color: "#FFFFFF" },
            ]}
          >
            Locations
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "conversations" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("conversations")}
        >
          <Feather
            name="message-circle"
            size={18}
            color={activeTab === "conversations" ? "#FFFFFF" : colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "conversations" && { color: "#FFFFFF" },
            ]}
          >
        <>
          {usersLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + Spacing.xl },
              ]}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="users" size={64} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Belum ada user
                  </ThemedText>
                </View>
              }
            />
          )}
          <Pressable
            style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + Spacing.xl }]}
            onPress={handleAddUser}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </>
      ) : activeTab === "locations" ? (
        <>
          {locationsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={locations}
              keyExtractor={(item) => item.user.id}
              renderItem={renderLocationItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + Spacing.xl },
              ]}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="map-pin" size={64} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Belum ada data lokasi
                  </ThemedText>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          {conversationsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + Spacing.xl },
              ]}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="message-circle" size={64} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Belum ada percakapan
                  </ThemedText>
                </View>
              }
            />
          )}
        </>
      )}

      {renderUserForm()}
      {renderMessagesModal()}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: "center",
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabText: {
    ...Typography.body,
    fontWeight: "500",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  userCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: "600",
  },
  userUsername: {
    ...Typography.small,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  userCardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  actionButtonText: {
    ...Typography.small,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationName: {
    ...Typography.body,
    fontWeight: "600",
  },
  locationUsername: {
    ...Typography.small,
  },
  locationCoords: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  locationTime: {
    ...Typography.caption,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
  },
  formContainer: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    ...Typography.small,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  formInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  roleButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleButtonText: {
    ...Typography.body,
    fontWeight: "500",
  },
  submitButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    ...Typography.body,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  conversationCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 28,
    alignItems: "center",
  },
  messageCountText: {
    ...Typography.caption,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  conversationParticipants: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  participantName: {
    ...Typography.body,
    fontWeight: "600",
  },
  participantSeparator: {
    ...Typography.body,
  },
  lastMessagePreview: {
    ...Typography.small,
  },
  conversationDate: {
    ...Typography.caption,
  },
  messagesModalContainer: {
    flex: 1,
  },
  messagesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  messagesModalHeaderInfo: {
    flex: 1,
  },
  messagesModalTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  messagesModalSubtitle: {
    ...Typography.caption,
  },
  messagesListContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  messageItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageSender: {
    ...Typography.small,
    fontWeight: "600",
  },
  messageTime: {
    ...Typography.caption,
  },
  messageContent: {
    ...Typography.body,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  expiryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  expiryBadgeText: {
    ...Typography.caption,
    color: "#FFFFFF",
    fontWeight: "500",
  },
});
