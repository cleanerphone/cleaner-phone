export interface User {
  id: string;
  username: string;
  displayName: string;
  companyId: string | null;
  role: "user" | "super_admin";
  isOnline: boolean;
  lastSeen?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastLocationUpdate?: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
    username: string;
    isOnline: boolean;
  };
  lastMessage: Message | null;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "image";
  content: string | null;
  imageUrl: string | null;
  ciphertext: string | null;
  nonce: string | null;
  senderPublicKey: string | null;
  isEncrypted: boolean;
  expiryType: "view_once" | "1_minute" | "1_hour" | "24_hours" | "permanent";
  expiresAt: string | null;
  isViewed: boolean;
  viewedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface UserLocation {
  user: {
    id: string;
    displayName: string;
    username: string;
    isOnline: boolean;
  };
  latitude: number;
  longitude: number;
  lastUpdate: string | null;
}

export type ExpiryType = "view_once" | "1_minute" | "1_hour" | "24_hours" | "permanent";

export const EXPIRY_OPTIONS: { value: ExpiryType; label: string }[] = [
  { value: "permanent", label: "Permanent" },
  { value: "view_once", label: "View Once" },
  { value: "1_minute", label: "1 Minute" },
  { value: "1_hour", label: "1 Hour" },
  { value: "24_hours", label: "24 Hours" },
];
