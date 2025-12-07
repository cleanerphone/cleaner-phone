import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.profileSection}>
          <Avatar
            name={user?.displayName || "User"}
            size={100}
            isOnline={user?.isOnline}
          />
          <ThemedText style={[styles.displayName, { color: theme.text }]}>
            {user?.displayName}
          </ThemedText>
          <ThemedText style={[styles.username, { color: theme.textSecondary }]}>
            @{user?.username}
          </ThemedText>
          {user?.role === "super_admin" && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText style={[styles.badgeText, { color: theme.buttonText }]}>
                Super Admin
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.infoRow}>
              <Feather name="user" size={20} color={theme.textSecondary} />
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Role
              </ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.text }]}>
                {user?.role === "super_admin" ? "Super Admin" : "User"}
              </ThemedText>
            </View>
            {user?.companyId && (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={20} color={theme.textSecondary} />
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Company ID
                </ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>
                  {user.companyId}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.logoutButton, { backgroundColor: theme.dangerLight }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={20} color={theme.danger} />
            <ThemedText style={[styles.logoutText, { color: theme.danger }]}>
              Log Out
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  displayName: {
    ...Typography.h3,
    marginTop: Spacing.lg,
  },
  username: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  badge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  infoSection: {
    marginBottom: Spacing["3xl"],
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    ...Typography.body,
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: "500",
  },
  footer: {
    marginTop: "auto",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  logoutText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
