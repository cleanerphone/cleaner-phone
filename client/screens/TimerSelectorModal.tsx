import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TimerOption = {
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
};

const TIMER_OPTIONS: TimerOption[] = [
  { value: "view_once", label: "View Once", icon: "eye-off", description: "Message disappears after viewing" },
  { value: "1_min", label: "1 Minute", icon: "clock", description: "Disappears after 1 minute" },
  { value: "1_hour", label: "1 Hour", icon: "clock", description: "Disappears after 1 hour" },
  { value: "24_hours", label: "24 Hours", icon: "clock", description: "Disappears after 24 hours" },
  { value: "permanent", label: "Permanent", icon: "check-circle", description: "Message stays forever" },
];

export default function TimerSelectorModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "TimerSelector">>();

  const { currentValue } = route.params;

  const handleSelect = (value: string) => {
    navigation.navigate({
      name: "Chat",
      params: { selectedTimer: value },
      merge: true,
    });
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <Pressable style={styles.overlay} onPress={handleClose}>
      <Pressable 
        style={[
          styles.modal, 
          { 
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.lg,
          }
        ]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Message Timer
          </ThemedText>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Feather name="x" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.options}>
          {TIMER_OPTIONS.map((option) => {
            const isSelected = currentValue === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.backgroundSecondary },
                  isSelected && { backgroundColor: theme.primary, opacity: 0.9 },
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <View style={styles.optionIcon}>
                  <Feather 
                    name={option.icon} 
                    size={24} 
                    color={isSelected ? theme.buttonText : theme.primary} 
                  />
                </View>
                <View style={styles.optionContent}>
                  <ThemedText 
                    style={[
                      styles.optionLabel, 
                      { color: isSelected ? theme.buttonText : theme.text }
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                  <ThemedText 
                    style={[
                      styles.optionDescription, 
                      { color: isSelected ? theme.buttonText : theme.textSecondary }
                    ]}
                  >
                    {option.description}
                  </ThemedText>
                </View>
                {isSelected && (
                  <Feather name="check" size={20} color={theme.buttonText} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h4,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  optionLabel: {
    ...Typography.body,
    fontWeight: "600",
  },
  optionDescription: {
    ...Typography.caption,
    marginTop: 2,
  },
});
