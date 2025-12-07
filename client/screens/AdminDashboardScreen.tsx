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

type TabType = "users" | "locations";

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const queryClient = useQueryClient();
  const colors = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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
        <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
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
      </View>

      {activeTab === "users" ? (
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
      ) : (
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
      )}

      {renderUserForm()}
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
  headerTitle: {
    ...Typography.h3,
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
});
