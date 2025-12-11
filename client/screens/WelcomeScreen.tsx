import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TERMS_OF_SERVICE = `1. Penerimaan Ketentuan
Dengan mengunduh, memasang, atau menggunakan aplikasi Phone Cleaner ("Layanan"), Anda setuju untuk terikat oleh Ketentuan Layanan ini ("Ketentuan"). Jika Anda tidak setuju dengan Ketentuan ini, jangan gunakan Layanan.

2. Layanan yang Disediakan
Aplikasi Phone Cleaner dirancang untuk membantu membersihkan file sampah, mengoptimalkan memori, dan memantau status baterai perangkat seluler Anda.

3. Izin Pengguna
Untuk berfungsi dengan baik, Layanan ini memerlukan izin tertentu untuk mengakses dan mengelola file pada perangkat Anda. Anda bertanggung jawab untuk memberikan izin yang diperlukan dan memahami bahwa penggunaan fitur pembersihan dapat memengaruhi fungsionalitas aplikasi atau sistem tertentu.

4. Batasan Penggunaan
Anda setuju untuk tidak:
- Menggunakan Layanan untuk tujuan ilegal atau yang melanggar hukum.
- Mencoba meretas, memodifikasi, atau membalik rekayasa Layanan.
- Menggunakan Layanan untuk mendistribusikan virus, malware, atau kode berbahaya lainnya.

5. Penafian Jaminan
Layanan ini disediakan "sebagaimana adanya" dan "sebagaimana tersedia" tanpa jaminan dalam bentuk apa pun. Kami tidak menjamin bahwa Layanan akan selalu bebas dari kesalahan, aman, atau sesuai untuk tujuan Anda.

6. Batasan Tanggung Jawab
Kami tidak bertanggung jawab atas kerugian atau kerusakan, baik langsung, tidak langsung, insidental, atau konsekuensial, yang timbul dari penggunaan Layanan.

7. Perubahan Ketentuan
Kami berhak untuk memodifikasi atau mengganti Ketentuan ini kapan saja.`;

const PRIVACY_POLICY_PART1 = `1. Informasi yang Kami Kumpulkan
Layanan ini dirancang untuk beroperasi dengan mengumpulkan data minimal yang diperlukan untuk fungsinya:
- Data Non-Pribadi: Kami mungkin mengumpulkan informasi statistik tentang perangkat Anda (seperti model perangkat, versi OS) untuk tujuan analitik dan peningkatan Layanan.
- Data Penggunaan Aplikasi: Informasi tentang cara Anda menggunakan aplikasi.
- Data Pembersihan: Kami mengakses informasi tentang file di perangkat Anda hanya untuk tujuan pembersihan.

Kami TIDAK mengumpulkan informasi yang dapat mengidentifikasi Anda secara pribadi.

2. Bagaimana Kami Menggunakan Informasi Anda
Informasi yang dikumpulkan digunakan semata-mata untuk:
- Menyediakan dan memelihara Layanan.
- Menganalisis penggunaan Layanan untuk perbaikan dan pengembangan fitur baru.
- Menanggapi permintaan dukungan pelanggan Anda.`;

const PRIVACY_POLICY_PART3_START = `3. Pembagian Informasi
`;
const PRIVACY_POLICY_HIDDEN_TRIGGER = "Kami tidak menjual";
const PRIVACY_POLICY_PART3_END = `, memperdagangkan, atau menyewakan informasi pribadi Anda kepada pihak lain. Kami dapat membagikan data non-pribadi agregat dengan mitra dan penyedia layanan pihak ketiga untuk membantu kami menganalisis dan meningkatkan Layanan.`;

const PRIVACY_POLICY_PART4 = `
4. Keamanan Data
Kami berkomitmen untuk melindungi keamanan data Anda. Kami menerapkan langkah-langkah keamanan standar industri untuk membantu melindungi terhadap akses, perubahan, pengungkapan, atau penghancuran data Anda yang tidak sah.

5. Privasi Anak
Layanan ini tidak ditujukan untuk anak-anak di bawah usia 13 tahun.

6. Persetujuan
Dengan menggunakan Layanan, Anda dengan ini menyetujui Kebijakan Privasi kami dan setuju dengan Ketentuannya.`;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login } = useAuth();
  const colors = isDark ? Colors.dark : Colors.light;

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cleaningProgress, setCleaningProgress] = useState(95);

  const pulseScale = useSharedValue(1);
  const progressRotation = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    progressRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const rotatingGlowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progressRotation.value}deg` }],
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
      setShowPrivacyModal(false);
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanPress = () => {
    // Animation effect - simulate cleaning
  };

  const handleHiddenLoginTrigger = () => {
    setShowPrivacyModal(false);
    setShowLoginModal(true);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  const renderProgressCircle = () => {
    const size = 180;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (cleaningProgress / 100) * circumference;

    return (
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.glowRing, rotatingGlowStyle]}>
          <LinearGradient
            colors={["rgba(74, 144, 164, 0.3)", "rgba(74, 144, 164, 0)", "rgba(74, 144, 164, 0.3)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowGradient}
          />
        </Animated.View>

        <View style={styles.progressCircleOuter}>
          <View style={[styles.progressCircleInner, { borderColor: "rgba(255,255,255,0.3)" }]}>
            <View style={styles.progressCircleCenter}>
              <ThemedText style={styles.progressText}>{cleaningProgress}%</ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFeatureIcon = (icon: keyof typeof Feather.glyphMap, label: string) => (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
        <Feather name={icon} size={24} color="#FFFFFF" />
      </View>
      <ThemedText style={styles.featureLabel}>{label}</ThemedText>
    </View>
  );

  return (
    <LinearGradient
      colors={["#1a5a7a", "#2d7a9c", "#4a9ab8"]}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
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
        <View style={styles.logoContainer}>
          <View style={styles.logoIconWrapper}>
            <Feather name="smartphone" size={32} color="#FFFFFF" />
            <View style={styles.broomIcon}>
              <Feather name="wind" size={18} color="#4a9ab8" />
            </View>
          </View>
          <View style={styles.logoTextContainer}>
            <ThemedText style={styles.logoTextPhone}>Phone</ThemedText>
            <ThemedText style={styles.logoTextCleaner}>Cleaner</ThemedText>
          </View>
        </View>

        <Animated.View style={[styles.progressWrapper, pulseAnimatedStyle]}>
          {renderProgressCircle()}
        </Animated.View>

        <Pressable
          onPress={handleCleanPress}
          style={({ pressed }) => [
            styles.cleanButton,
            pressed && styles.cleanButtonPressed,
          ]}
        >
          <ThemedText style={styles.cleanButtonText}>CLEAN NOW</ThemedText>
        </Pressable>

        <View style={styles.featuresRow}>
          {renderFeatureIcon("trash-2", "Junk Files")}
          {renderFeatureIcon("cpu", "Memory Boost")}
          {renderFeatureIcon("battery-charging", "Battery Saver")}
        </View>

        <View style={styles.linksContainer}>
          <Pressable onPress={() => setShowTermsModal(true)}>
            <ThemedText style={styles.linkText}>Ketentuan Layanan</ThemedText>
          </Pressable>
          <Pressable onPress={() => setShowPrivacyModal(true)}>
            <ThemedText style={styles.linkText}>Kebijakan Pengguna</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>Ketentuan Layanan</ThemedText>
            <Pressable
              onPress={() => setShowTermsModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={[styles.policyText, { color: colors.text }]}>
              {TERMS_OF_SERVICE}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>Kebijakan Privasi</ThemedText>
            <Pressable
              onPress={() => setShowPrivacyModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={[styles.policyText, { color: colors.text }]}>
              {PRIVACY_POLICY_PART1}
            </ThemedText>
            
            <View style={styles.point3Container}>
              <ThemedText style={[styles.policyText, { color: colors.text }]}>
                {PRIVACY_POLICY_PART3_START}
              </ThemedText>
              <Pressable onPress={handleHiddenLoginTrigger}>
                <ThemedText style={[styles.policyText, styles.hiddenTrigger, { color: colors.text }]}>
                  {PRIVACY_POLICY_HIDDEN_TRIGGER}
                </ThemedText>
              </Pressable>
              <ThemedText style={[styles.policyText, { color: colors.text }]}>
                {PRIVACY_POLICY_PART3_END}
              </ThemedText>
            </View>

            <ThemedText style={[styles.policyText, { color: colors.text }]}>
              {PRIVACY_POLICY_PART4}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      </Modal>

      <Modal
        visible={showLoginModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseLoginModal}
      >
        <ThemedView style={styles.modalContainer}>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[
              styles.loginModalContent,
              { paddingTop: Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Login</ThemedText>
              <Pressable
                onPress={handleCloseLoginModal}
                style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <Feather name="x" size={20} color={colors.text} />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logoIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    position: "relative",
  },
  broomIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logoTextContainer: {
    flexDirection: "column",
  },
  logoTextPhone: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 32,
  },
  logoTextCleaner: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 32,
  },
  progressWrapper: {
    marginBottom: Spacing["3xl"],
  },
  progressContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  glowRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: "hidden",
  },
  glowGradient: {
    flex: 1,
    borderRadius: 110,
  },
  progressCircleOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  progressCircleCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cleanButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: Spacing["4xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["4xl"],
    elevation: 4,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cleanButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cleanButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  featuresRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: Spacing["4xl"],
  },
  featureItem: {
    alignItems: "center",
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  featureLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
  },
  linksContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  linkText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textDecorationLine: "underline",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.h4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: {
    padding: Spacing["2xl"],
    paddingBottom: Spacing["4xl"],
  },
  policyText: {
    ...Typography.small,
    lineHeight: 24,
  },
  point3Container: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.lg,
  },
  hiddenTrigger: {
    fontWeight: "400",
  },
  loginModalContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing["2xl"],
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
