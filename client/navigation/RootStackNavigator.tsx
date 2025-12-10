import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import WelcomeScreen from "@/screens/WelcomeScreen";
import ConversationsScreen from "@/screens/ConversationsScreen";
import ChatScreen from "@/screens/ChatScreen";
import NewChatScreen from "@/screens/NewChatScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import TimerSelectorModal from "@/screens/TimerSelectorModal";
import AdminDashboardScreen from "@/screens/AdminDashboardScreen";

export type RootStackParamList = {
  Login: undefined;
  Conversations: undefined;
  Chat: { conversationId: string; otherUser: { id: string; displayName: string; isOnline: boolean }; selectedTimer?: string };
  NewChat: undefined;
  Profile: undefined;
  TimerSelector: { currentValue: string };
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NewChat"
            component={NewChatScreen}
            options={{
              headerTitle: "New Chat",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerTitle: "Profile",
            }}
          />
          <Stack.Screen
            name="TimerSelector"
            component={TimerSelectorModal}
            options={{
              presentation: "transparentModal",
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
