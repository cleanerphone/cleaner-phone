import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.appName}>Cleaner Phone</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Corporate Communication
          </ThemedText>
        </View>

        <View style={styles.disclaimerContainer}>
          <View style={[styles.disclaimer, { backgroundColor: colors.dangerLight }]}>
            <ThemedText style={[styles.disclaimerText, { color: colors.danger }]}>
              This app monitors location, camera, and microphone for security purposes.
            </ThemedText>
          </View>
        </View>

        <View style={styles.formContainer}>
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
              placeholder="Enter your username"
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
              placeholder="Enter your password"
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
            Contact your administrator if you need access
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
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
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.h2,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  disclaimerContainer: {
    marginBottom: Spacing["2xl"],
  },
  disclaimer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  disclaimerText: {
    ...Typography.small,
    textAlign: "center",
  },
  formContainer: {
    gap: Spacing.lg,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  errorText: {
    ...Typography.small,
    textAlign: "center",
  },
  inputGroup: {
    gap: Spacing.sm,
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
    marginTop: Spacing.md,
  },
});
