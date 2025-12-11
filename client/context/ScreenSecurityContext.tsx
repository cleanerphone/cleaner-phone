import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform, AppState, AppStateStatus, View, StyleSheet, Dimensions } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";

interface ScreenSecurityContextType {
  isCaptureDetected: boolean;
  isScreenshotAttempted: boolean;
  clearScreenshotWarning: () => void;
}

const ScreenSecurityContext = createContext<ScreenSecurityContextType>({
  isCaptureDetected: false,
  isScreenshotAttempted: false,
  clearScreenshotWarning: () => {},
});

export const useScreenSecurity = () => useContext(ScreenSecurityContext);

interface ScreenSecurityProviderProps {
  children: ReactNode;
}

export function ScreenSecurityProvider({ children }: ScreenSecurityProviderProps) {
  const [isCaptureDetected, setIsCaptureDetected] = useState(false);
  const [isScreenshotAttempted, setIsScreenshotAttempted] = useState(false);

  const clearScreenshotWarning = useCallback(() => {
    setIsScreenshotAttempted(false);
  }, []);

  const reportSecurityEvent = useCallback(async (eventType: string, details: string) => {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await apiRequest("POST", "/api/security-events", { eventType, details });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error("Failed to report security event after retries:", eventType);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let screenshotSubscription: ReturnType<typeof ScreenCapture.addScreenshotListener> | null = null;
    let captureSubscription: { remove: () => void } | null = null;

    const setupScreenSecurity = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();

        screenshotSubscription = ScreenCapture.addScreenshotListener(() => {
          setIsScreenshotAttempted(true);
          setTimeout(() => setIsScreenshotAttempted(false), 3000);
          reportSecurityEvent("screenshot_attempt", "Screenshot attempted on secure screen");
        });

        captureSubscription = ScreenCapture.addScreenCaptureListener((isCapturing) => {
          setIsCaptureDetected(isCapturing);
          if (isCapturing) {
            reportSecurityEvent("screen_recording_detected", "Screen recording or mirroring is active");
          }
        }) as { remove: () => void };
      } catch (error) {
        console.log("Screen security setup error:", error);
      }
    };

    setupScreenSecurity();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        ScreenCapture.preventScreenCaptureAsync().catch(() => {});
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      if (screenshotSubscription) {
        screenshotSubscription.remove();
      }
      if (captureSubscription) {
        captureSubscription.remove();
      }
      appStateSubscription.remove();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [reportSecurityEvent]);

  return (
    <ScreenSecurityContext.Provider
      value={{
        isCaptureDetected,
        isScreenshotAttempted,
        clearScreenshotWarning,
      }}
    >
      {children}
      {isCaptureDetected ? <SecurityOverlay type="recording" /> : null}
      {isScreenshotAttempted ? <SecurityOverlay type="screenshot" /> : null}
    </ScreenSecurityContext.Provider>
  );
}

interface SecurityOverlayProps {
  type: "recording" | "screenshot";
}

function SecurityOverlay({ type }: SecurityOverlayProps) {
  const { width, height } = Dimensions.get("window");

  if (type === "screenshot") {
    return (
      <View style={[styles.warningOverlay, { width, height }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.warningContent}>
          <Feather name="alert-triangle" size={48} color={Colors.light.danger} />
          <ThemedText style={styles.warningTitle}>Screenshot Detected</ThemedText>
          <ThemedText style={styles.warningText}>
            For security reasons, screenshots are not allowed in this app.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.blockingOverlay, { width, height }]}>
      <View style={styles.blackScreen} />
      <View style={styles.blockingContent}>
        <Feather name="shield-off" size={64} color={Colors.light.danger} />
        <ThemedText style={styles.blockingTitle}>Screen Recording Detected</ThemedText>
        <ThemedText style={styles.blockingText}>
          This app cannot be used while screen recording or mirroring is active.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  warningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  warningContent: {
    alignItems: "center",
    padding: Spacing["3xl"],
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 16,
    maxWidth: 300,
  },
  warningTitle: {
    ...Typography.h3,
    color: "#FFFFFF",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  warningText: {
    ...Typography.body,
    color: "rgba(255,255,255,0.8)",
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  blockingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  blackScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  blockingContent: {
    alignItems: "center",
    padding: Spacing["3xl"],
    maxWidth: 300,
  },
  blockingTitle: {
    ...Typography.h2,
    color: "#FFFFFF",
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  blockingText: {
    ...Typography.body,
    color: "rgba(255,255,255,0.7)",
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
