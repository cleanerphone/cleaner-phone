import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login } = useAuth();
  const colors = isDark ? Colors.dark : Colors.light;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const pulseScale = useSharedValue(1);
  const rippleScale = useSharedValue(0.8);
  const rippleOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rippleScale.value = withRepeat(
      withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    rippleOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Masukkan username dan password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(username.trim(), password);
      setShowLoginModal(false);
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPress = () => {
    setShowLoginModal(true);
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.appTitle}>CLEANER PHONE</ThemedText>

        <View style={styles.buttonContainer}>
          <Animated.View style={[styles.ripple, rippleAnimatedStyle, { borderColor: colors.primary }]} />
          <Animated.View style={[styles.outerGlow, { backgroundColor: `${colors.primary}15` }]} />
          <Animated.View style={[styles.middleGlow, { backgroundColor: `${colors.primary}25` }]} />
          
          <Pressable
            onPress={handleStartPress}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.primary },
              pressed && styles.startButtonPressed,
            ]}
          >
            <Animated.View style={[styles.startButtonInner, pulseAnimatedStyle]}>
              <ThemedText style={styles.startButtonText}>START</ThemedText>
            </Animated.View>
          </Pressable>

          <View style={styles.decorDots}>
            <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot, styles.dotTopRight, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot, styles.dotBottomLeft, { backgroundColor: colors.primary }]} />
            <View style={[styles.dotSmall, styles.dotSmallTop, { backgroundColor: colors.primary }]} />
            <View style={[styles.dotSmall, styles.dotSmallRight, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={[styles.policyContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Kebijakan Pengguna
          </ThemedText>
          <ThemedText style={[styles.policyText, { color: colors.textSecondary }]}>
            Dengan menggunakan aplikasi Cleaner Phone, Anda menyetujui bahwa aplikasi ini dapat mengakses dan memantau lokasi perangkat, kamera, dan mikrofon untuk keperluan keamanan korporat. Data yang dikumpulkan akan digunakan sesuai dengan kebijakan privasi perusahaan dan tidak akan dibagikan kepada pihak ketiga tanpa persetujuan.
          </ThemedText>
          <ThemedText style={[styles.policyText, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Pengguna bertanggung jawab untuk menjaga kerahasiaan kredensial akun dan melaporkan aktivitas mencurigakan kepada administrator. Pelanggaran terhadap kebijakan penggunaan dapat mengakibatkan pembatasan atau pencabutan akses.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
            Ketentuan Layanan
          </ThemedText>
          <ThemedText style={[styles.policyText, { color: colors.textSecondary }]}>
            Layanan Cleaner Phone disediakan untuk keperluan komunikasi internal perusahaan dengan fitur pesan yang dapat dihapus otomatis. Pengguna dilarang menggunakan aplikasi untuk tujuan ilegal atau melanggar hukum yang berlaku.
          </ThemedText>
          <View style={styles.termsLoginContainer}>
            <ThemedText style={[styles.policyText, { color: colors.textSecondary }]}>
              Dengan menekan tombol START atau melakukan{" "}
            </ThemedText>
            <Pressable onPress={() => setShowLoginModal(true)}>
              <ThemedText style={[styles.loginLink, { color: colors.primary }]}>
                login
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.policyText, { color: colors.textSecondary }]}>
              , Anda menyatakan telah membaca, memahami, dan menyetujui seluruh kebijakan pengguna dan ketentuan layanan yang berlaku.
            </ThemedText>
          </View>
          <ThemedText style={[styles.policyText, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Kami berhak untuk mengubah ketentuan layanan sewaktu-waktu tanpa pemberitahuan sebelumnya. Penggunaan berkelanjutan atas aplikasi ini dianggap sebagai persetujuan terhadap perubahan tersebut.
          </ThemedText>
        </View>
      </ScrollView>

      <Modal
        visible={showLoginModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <ThemedView style={styles.modalContainer}>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[
              styles.modalContent,
              { paddingTop: Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Login</ThemedText>
              <Pressable
                onPress={handleCloseModal}
                style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <ThemedText style={{ color: colors.text }}>Tutup</ThemedText>
              </Pressable>
            </View>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
                <ThemedText style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Username
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundDefault,
                    borderColor: colors.border,
                    color: theme.text,
                  },
                ]}
                value={username}
                onChangeText={setUsername}
                placeholder="Masukkan username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Password
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundDefault,
                    borderColor: colors.border,
                    color: theme.text,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                { backgroundColor: colors.primary },
                pressed && styles.loginButtonPressed,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <ThemedText style={[styles.loginButtonText, { color: colors.buttonText }]}>
                  Login
                </ThemedText>
              )}
            </Pressable>

            <ThemedText style={[styles.helpText, { color: colors.textSecondary }]}>
              Hubungi administrator jika Anda memerlukan akses
            </ThemedText>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  appTitle: {
    ...Typography.h2,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: Spacing["4xl"],
  },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 280,
    marginBottom: Spacing["3xl"],
    position: "relative",
  },
  ripple: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  outerGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  middleGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  startButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#2C5F8D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  startButtonInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1,
  },
  decorDots: {
    position: "absolute",
    width: 280,
    height: 280,
  },
  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  dotSmall: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  dotTopLeft: {
    top: 20,
    left: 60,
  },
  dotTopRight: {
    top: 40,
    right: 40,
  },
  dotBottomLeft: {
    bottom: 50,
    left: 30,
  },
  dotSmallTop: {
    top: 60,
    right: 70,
  },
  dotSmallRight: {
    top: 120,
    right: 20,
  },
  policyContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  policyText: {
    ...Typography.small,
    lineHeight: 22,
  },
  termsLoginContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
  },
  loginLink: {
    ...Typography.small,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  modalTitle: {
    ...Typography.h3,
  },
  closeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.small,
    textAlign: "center",
  },
  inputGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.small,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  loginButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  loginButtonPressed: {
    opacity: 0.8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  helpText: {
    ...Typography.small,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
