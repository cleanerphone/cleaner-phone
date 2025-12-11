import {
  type User,
  type InsertUser,
  type Conversation,
  type Message,
  type InsertMessage,
  type UserKey,
  type SecurityEvent,
  users,
  conversations,
  messages,
  remoteAccessSessions,
  userKeys,
  securityEvents,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  validatePassword(user: User, password: string): Promise<boolean>;
  
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByParticipants(user1Id: string, user2Id: string): Promise<Conversation | undefined>;
  createConversation(participant1Id: string, participant2Id: string): Promise<Conversation>;
  getConversationsForUser(userId: string): Promise<Array<Conversation & { otherUser: User; lastMessage: Message | null }>>;
  
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  markMessageAsViewed(messageId: string): Promise<Message | undefined>;
  deleteExpiredMessages(): Promise<void>;
  
  updateUserLocation(userId: string, latitude: number, longitude: number): Promise<void>;
  getUserLocations(): Promise<Array<{ user: User; latitude: number; longitude: number }>>;
  
  getAllConversationsWithDetails(): Promise<Array<{
    id: string;
    participant1: User;
    participant2: User;
    lastMessage: Message | null;
    lastMessageAt: Date | null;
    messageCount: number;
  }>>;
  getAllMessagesForConversation(conversationId: string): Promise<Message[]>;

  getUserKey(userId: string): Promise<UserKey | undefined>;
  setUserKey(userId: string, publicKey: string): Promise<UserKey>;
  
  createSecurityEvent(data: {
    userId?: string;
    eventType: "screenshot_attempt" | "screen_recording_detected" | "login_failed" | "suspicious_activity";
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SecurityEvent>;
  getSecurityEvents(limit?: number): Promise<SecurityEvent[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.displayName);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByParticipants(user1Id: string, user2Id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, user1Id),
            eq(conversations.participant2Id, user2Id)
          ),
          and(
            eq(conversations.participant1Id, user2Id),
            eq(conversations.participant2Id, user1Id)
          )
        )
      );
    return conversation || undefined;
  }

  async createConversation(participant1Id: string, participant2Id: string): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        participant1Id,
        participant2Id,
      })
      .returning();
    return conversation;
  }

  async getConversationsForUser(userId: string): Promise<Array<Conversation & { otherUser: User; lastMessage: Message | null }>> {
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const result = [];
    for (const conv of userConversations) {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
      
      let lastMessage: Message | null = null;
      if (conv.lastMessageId) {
        const [msg] = await db.select().from(messages).where(eq(messages.id, conv.lastMessageId));
        lastMessage = msg || null;
      }
      
      if (otherUser) {
        result.push({ ...conv, otherUser, lastMessage });
      }
    }
    
    return result;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    let expiresAt: Date | null = null;
    
    if (data.expiryType && data.expiryType !== "permanent" && data.expiryType !== "view_once") {
      const now = new Date();
      switch (data.expiryType) {
        case "1_minute":
          expiresAt = new Date(now.getTime() + 60 * 1000);
          break;
        case "1_hour":
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case "24_hours":
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
      }
    }

    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        expiresAt,
      })
      .returning();

    await db
      .update(conversations)
      .set({
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      })
      .where(eq(conversations.id, data.conversationId));

    return message;
  }

  async markMessageAsViewed(messageId: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    
    if (!message) return undefined;
    
    const updates: Partial<Message> = {
      isViewed: true,
      viewedAt: new Date(),
    };
    
    if (message.expiryType === "view_once") {
      updates.isDeleted = true;
    }
    
    const [updated] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();
    
    return updated;
  }

  async deleteExpiredMessages(): Promise<void> {
    const now = new Date();
    await db
      .update(messages)
      .set({ isDeleted: true })
      .where(
        and(
          eq(messages.isDeleted, false),
          sql`${messages.expiresAt} IS NOT NULL AND ${messages.expiresAt} < ${now}`
        )
      );
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number): Promise<void> {
    await db
      .update(users)
      .set({
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date(),
        isOnline: true,
        lastSeen: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserLocations(): Promise<Array<{ user: User; latitude: number; longitude: number }>> {
    const usersWithLocation = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.lastLatitude} IS NOT NULL`,
          sql`${users.lastLongitude} IS NOT NULL`,
          eq(users.role, "user")
        )
      );
    
    return usersWithLocation.map((user) => ({
      user,
      latitude: user.lastLatitude!,
      longitude: user.lastLongitude!,
    }));
  }

  async getAllConversationsWithDetails(): Promise<Array<{
    id: string;
    participant1: User;
    participant2: User;
    lastMessage: Message | null;
    lastMessageAt: Date | null;
    messageCount: number;
  }>> {
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));

    const result = [];
    for (const conv of allConversations) {
      const [participant1] = await db.select().from(users).where(eq(users.id, conv.participant1Id));
      const [participant2] = await db.select().from(users).where(eq(users.id, conv.participant2Id));
      
      if (!participant1 || !participant2) continue;

      let lastMessage: Message | null = null;
      if (conv.lastMessageId) {
        const [msg] = await db.select().from(messages).where(eq(messages.id, conv.lastMessageId));
        lastMessage = msg || null;
      }

      const messageCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));
      const messageCount = Number(messageCountResult[0]?.count || 0);

      result.push({
        id: conv.id,
        participant1,
        participant2,
        lastMessage,
        lastMessageAt: conv.lastMessageAt,
        messageCount,
      });
    }

    return result;
  }

  async getAllMessagesForConversation(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getUserKey(userId: string): Promise<UserKey | undefined> {
    const [key] = await db.select().from(userKeys).where(eq(userKeys.userId, userId));
    return key || undefined;
  }

  async setUserKey(userId: string, publicKey: string): Promise<UserKey> {
    const existing = await this.getUserKey(userId);
    if (existing) {
      const [updated] = await db
        .update(userKeys)
        .set({ publicKey, updatedAt: new Date() })
        .where(eq(userKeys.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userKeys)
      .values({ userId, publicKey })
      .returning();
    return created;
  }

  async createSecurityEvent(data: {
    userId?: string;
    eventType: "screenshot_attempt" | "screen_recording_detected" | "login_failed" | "suspicious_activity";
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SecurityEvent> {
    const [event] = await db
      .insert(securityEvents)
      .values(data)
      .returning();
    return event;
  }

  async getSecurityEvents(limit: number = 100): Promise<SecurityEvent[]> {
    return db
      .select()
      .from(securityEvents)
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
