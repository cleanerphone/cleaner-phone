"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/objectAcl.ts
var objectAcl_exports = {};
__export(objectAcl_exports, {
  ObjectAccessGroupType: () => ObjectAccessGroupType,
  ObjectPermission: () => ObjectPermission,
  canAccessObject: () => canAccessObject,
  getObjectAclPolicy: () => getObjectAclPolicy,
  setObjectAclPolicy: () => setObjectAclPolicy
});
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}
var ACL_POLICY_METADATA_KEY, ObjectAccessGroupType, ObjectPermission;
var init_objectAcl = __esm({
  "server/objectAcl.ts"() {
    "use strict";
    ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
    ObjectAccessGroupType = /* @__PURE__ */ ((ObjectAccessGroupType2) => {
      return ObjectAccessGroupType2;
    })(ObjectAccessGroupType || {});
    ObjectPermission = /* @__PURE__ */ ((ObjectPermission2) => {
      ObjectPermission2["READ"] = "read";
      ObjectPermission2["WRITE"] = "write";
      return ObjectPermission2;
    })(ObjectPermission || {});
  }
});

// server/index.ts
var import_express = __toESM(require("express"));

// server/routes.ts
var import_http = require("http");
var import_socket = require("socket.io");

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  callLogs: () => callLogs,
  callStatusEnum: () => callStatusEnum,
  conversations: () => conversations,
  conversationsRelations: () => conversationsRelations,
  insertMessageSchema: () => insertMessageSchema,
  insertSecurityEventSchema: () => insertSecurityEventSchema,
  insertUserKeySchema: () => insertUserKeySchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  messageExpiryEnum: () => messageExpiryEnum,
  messageTypeEnum: () => messageTypeEnum,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  remoteAccessSessions: () => remoteAccessSessions,
  securityEventTypeEnum: () => securityEventTypeEnum,
  securityEvents: () => securityEvents,
  userKeys: () => userKeys,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  usersRelations: () => usersRelations
});
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var import_zod = require("zod");
var userRoleEnum = (0, import_pg_core.pgEnum)("user_role", ["user", "super_admin"]);
var messageTypeEnum = (0, import_pg_core.pgEnum)("message_type", ["text", "image"]);
var messageExpiryEnum = (0, import_pg_core.pgEnum)("message_expiry", ["view_once", "1_minute", "1_hour", "24_hours", "permanent"]);
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  username: (0, import_pg_core.text)("username").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull(),
  displayName: (0, import_pg_core.text)("display_name").notNull(),
  companyId: (0, import_pg_core.text)("company_id"),
  role: userRoleEnum("role").notNull().default("user"),
  isOnline: (0, import_pg_core.boolean)("is_online").notNull().default(false),
  lastSeen: (0, import_pg_core.timestamp)("last_seen").defaultNow(),
  lastLatitude: (0, import_pg_core.real)("last_latitude"),
  lastLongitude: (0, import_pg_core.real)("last_longitude"),
  lastLocationUpdate: (0, import_pg_core.timestamp)("last_location_update"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var conversations = (0, import_pg_core.pgTable)("conversations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  participant1Id: (0, import_pg_core.varchar)("participant1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participant2Id: (0, import_pg_core.varchar)("participant2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageId: (0, import_pg_core.varchar)("last_message_id"),
  lastMessageAt: (0, import_pg_core.timestamp)("last_message_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var messages = (0, import_pg_core.pgTable)("messages", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  conversationId: (0, import_pg_core.varchar)("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: (0, import_pg_core.varchar)("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: messageTypeEnum("type").notNull().default("text"),
  content: (0, import_pg_core.text)("content"),
  imageUrl: (0, import_pg_core.text)("image_url"),
  ciphertext: (0, import_pg_core.text)("ciphertext"),
  nonce: (0, import_pg_core.text)("nonce"),
  senderPublicKey: (0, import_pg_core.text)("sender_public_key"),
  isEncrypted: (0, import_pg_core.boolean)("is_encrypted").notNull().default(false),
  expiryType: messageExpiryEnum("expiry_type").notNull().default("permanent"),
  expiresAt: (0, import_pg_core.timestamp)("expires_at"),
  isViewed: (0, import_pg_core.boolean)("is_viewed").notNull().default(false),
  viewedAt: (0, import_pg_core.timestamp)("viewed_at"),
  isDeleted: (0, import_pg_core.boolean)("is_deleted").notNull().default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var remoteAccessSessions = (0, import_pg_core.pgTable)("remote_access_sessions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  adminId: (0, import_pg_core.varchar)("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: (0, import_pg_core.varchar)("target_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessType: (0, import_pg_core.text)("access_type").notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  startedAt: (0, import_pg_core.timestamp)("started_at").defaultNow().notNull(),
  endedAt: (0, import_pg_core.timestamp)("ended_at")
});
var userKeys = (0, import_pg_core.pgTable)("user_keys", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  publicKey: (0, import_pg_core.text)("public_key").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var securityEventTypeEnum = (0, import_pg_core.pgEnum)("security_event_type", ["screenshot_attempt", "screen_recording_detected", "login_failed", "suspicious_activity"]);
var callStatusEnum = (0, import_pg_core.pgEnum)("call_status", ["ringing", "active", "ended", "missed", "rejected"]);
var callLogs = (0, import_pg_core.pgTable)("call_logs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  callerId: (0, import_pg_core.varchar)("caller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: (0, import_pg_core.varchar)("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: callStatusEnum("status").notNull().default("ringing"),
  startedAt: (0, import_pg_core.timestamp)("started_at").defaultNow().notNull(),
  answeredAt: (0, import_pg_core.timestamp)("answered_at"),
  endedAt: (0, import_pg_core.timestamp)("ended_at"),
  duration: (0, import_pg_core.integer)("duration")
});
var securityEvents = (0, import_pg_core.pgTable)("security_events", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: securityEventTypeEnum("event_type").notNull(),
  details: (0, import_pg_core.text)("details"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var usersRelations = (0, import_drizzle_orm.relations)(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sender" }),
  conversationsAsParticipant1: many(conversations, { relationName: "participant1" }),
  conversationsAsParticipant2: many(conversations, { relationName: "participant2" })
}));
var conversationsRelations = (0, import_drizzle_orm.relations)(conversations, ({ one, many }) => ({
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: "participant1"
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: "participant2"
  }),
  messages: many(messages)
}));
var messagesRelations = (0, import_drizzle_orm.relations)(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  })
}));
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  username: true,
  password: true,
  displayName: true,
  companyId: true,
  role: true
});
var loginSchema = import_zod.z.object({
  username: import_zod.z.string().min(1, "Username is required"),
  password: import_zod.z.string().min(1, "Password is required")
});
var insertMessageSchema = (0, import_drizzle_zod.createInsertSchema)(messages).pick({
  conversationId: true,
  senderId: true,
  type: true,
  content: true,
  imageUrl: true,
  expiryType: true
});
var insertUserKeySchema = (0, import_drizzle_zod.createInsertSchema)(userKeys).pick({
  userId: true,
  publicKey: true
});
var insertSecurityEventSchema = (0, import_drizzle_zod.createInsertSchema)(securityEvents).pick({
  userId: true,
  eventType: true,
  details: true,
  ipAddress: true,
  userAgent: true
});

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"));
var { Pool } = import_pg.default;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/storage.ts
var import_drizzle_orm2 = require("drizzle-orm");
var bcrypt = __toESM(require("bcryptjs"));
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword
    }).returning();
    return user;
  }
  async updateUser(id, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const [user] = await db.update(users).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(users.id, id)).returning();
    return user || void 0;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where((0, import_drizzle_orm2.eq)(users.id, id)).returning();
    return result.length > 0;
  }
  async getAllUsers() {
    return db.select().from(users).orderBy(users.displayName);
  }
  async validatePassword(user, password) {
    return bcrypt.compare(password, user.password);
  }
  async updateUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(users.id, userId));
  }
  async getConversation(id) {
    const [conversation] = await db.select().from(conversations).where((0, import_drizzle_orm2.eq)(conversations.id, id));
    return conversation || void 0;
  }
  async getConversationByParticipants(user1Id, user2Id) {
    const [conversation] = await db.select().from(conversations).where(
      (0, import_drizzle_orm2.or)(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(conversations.participant1Id, user1Id),
          (0, import_drizzle_orm2.eq)(conversations.participant2Id, user2Id)
        ),
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(conversations.participant1Id, user2Id),
          (0, import_drizzle_orm2.eq)(conversations.participant2Id, user1Id)
        )
      )
    );
    return conversation || void 0;
  }
  async createConversation(participant1Id, participant2Id) {
    const [conversation] = await db.insert(conversations).values({
      participant1Id,
      participant2Id
    }).returning();
    return conversation;
  }
  async getConversationsForUser(userId) {
    const userConversations = await db.select().from(conversations).where(
      (0, import_drizzle_orm2.or)(
        (0, import_drizzle_orm2.eq)(conversations.participant1Id, userId),
        (0, import_drizzle_orm2.eq)(conversations.participant2Id, userId)
      )
    ).orderBy((0, import_drizzle_orm2.desc)(conversations.lastMessageAt));
    const result = [];
    for (const conv of userConversations) {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const [otherUser] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, otherUserId));
      let lastMessage = null;
      if (conv.lastMessageId) {
        const [msg] = await db.select().from(messages).where((0, import_drizzle_orm2.eq)(messages.id, conv.lastMessageId));
        lastMessage = msg || null;
      }
      if (otherUser) {
        result.push({ ...conv, otherUser, lastMessage });
      }
    }
    return result;
  }
  async getMessages(conversationId) {
    return db.select().from(messages).where(
      (0, import_drizzle_orm2.and)(
        (0, import_drizzle_orm2.eq)(messages.conversationId, conversationId),
        (0, import_drizzle_orm2.eq)(messages.isDeleted, false)
      )
    ).orderBy(messages.createdAt);
  }
  async createMessage(data) {
    let expiresAt = null;
    if (data.expiryType && data.expiryType !== "permanent" && data.expiryType !== "view_once") {
      const now = /* @__PURE__ */ new Date();
      switch (data.expiryType) {
        case "1_minute":
          expiresAt = new Date(now.getTime() + 60 * 1e3);
          break;
        case "1_hour":
          expiresAt = new Date(now.getTime() + 60 * 60 * 1e3);
          break;
        case "24_hours":
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
          break;
      }
    }
    const [message] = await db.insert(messages).values({
      ...data,
      expiresAt
    }).returning();
    await db.update(conversations).set({
      lastMessageId: message.id,
      lastMessageAt: message.createdAt
    }).where((0, import_drizzle_orm2.eq)(conversations.id, data.conversationId));
    return message;
  }
  async markMessageAsViewed(messageId) {
    const [message] = await db.select().from(messages).where((0, import_drizzle_orm2.eq)(messages.id, messageId));
    if (!message) return void 0;
    const updates = {
      isViewed: true,
      viewedAt: /* @__PURE__ */ new Date()
    };
    if (message.expiryType === "view_once") {
      updates.isDeleted = true;
    }
    const [updated] = await db.update(messages).set(updates).where((0, import_drizzle_orm2.eq)(messages.id, messageId)).returning();
    return updated;
  }
  async deleteExpiredMessages() {
    const now = /* @__PURE__ */ new Date();
    await db.update(messages).set({ isDeleted: true }).where(
      (0, import_drizzle_orm2.and)(
        (0, import_drizzle_orm2.eq)(messages.isDeleted, false),
        import_drizzle_orm2.sql`${messages.expiresAt} IS NOT NULL AND ${messages.expiresAt} < ${now}`
      )
    );
  }
  async updateUserLocation(userId, latitude, longitude) {
    await db.update(users).set({
      lastLatitude: latitude,
      lastLongitude: longitude,
      lastLocationUpdate: /* @__PURE__ */ new Date(),
      isOnline: true,
      lastSeen: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.eq)(users.id, userId));
  }
  async getUserLocations() {
    const usersWithLocation = await db.select().from(users).where(
      (0, import_drizzle_orm2.and)(
        import_drizzle_orm2.sql`${users.lastLatitude} IS NOT NULL`,
        import_drizzle_orm2.sql`${users.lastLongitude} IS NOT NULL`,
        (0, import_drizzle_orm2.eq)(users.role, "user")
      )
    );
    return usersWithLocation.map((user) => ({
      user,
      latitude: user.lastLatitude,
      longitude: user.lastLongitude
    }));
  }
  async getAllConversationsWithDetails() {
    const allConversations = await db.select().from(conversations).orderBy((0, import_drizzle_orm2.desc)(conversations.lastMessageAt));
    const result = [];
    for (const conv of allConversations) {
      const [participant1] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, conv.participant1Id));
      const [participant2] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, conv.participant2Id));
      if (!participant1 || !participant2) continue;
      let lastMessage = null;
      if (conv.lastMessageId) {
        const [msg] = await db.select().from(messages).where((0, import_drizzle_orm2.eq)(messages.id, conv.lastMessageId));
        lastMessage = msg || null;
      }
      const messageCountResult = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(messages).where((0, import_drizzle_orm2.eq)(messages.conversationId, conv.id));
      const messageCount = Number(messageCountResult[0]?.count || 0);
      result.push({
        id: conv.id,
        participant1,
        participant2,
        lastMessage,
        lastMessageAt: conv.lastMessageAt,
        messageCount
      });
    }
    return result;
  }
  async getAllMessagesForConversation(conversationId) {
    return db.select().from(messages).where((0, import_drizzle_orm2.eq)(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }
  async getUserKey(userId) {
    const [key] = await db.select().from(userKeys).where((0, import_drizzle_orm2.eq)(userKeys.userId, userId));
    return key || void 0;
  }
  async setUserKey(userId, publicKey) {
    const existing = await this.getUserKey(userId);
    if (existing) {
      const [updated] = await db.update(userKeys).set({ publicKey, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(userKeys.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(userKeys).values({ userId, publicKey }).returning();
    return created;
  }
  async createSecurityEvent(data) {
    const [event] = await db.insert(securityEvents).values(data).returning();
    return event;
  }
  async getSecurityEvents(limit = 100) {
    return db.select().from(securityEvents).orderBy((0, import_drizzle_orm2.desc)(securityEvents.createdAt)).limit(limit);
  }
  async createCallLog(callerId, receiverId) {
    const [callLog] = await db.insert(callLogs).values({ callerId, receiverId }).returning();
    return callLog;
  }
  async updateCallLog(id, data) {
    const [updated] = await db.update(callLogs).set(data).where((0, import_drizzle_orm2.eq)(callLogs.id, id)).returning();
    return updated || void 0;
  }
  async getCallLog(id) {
    const [callLog] = await db.select().from(callLogs).where((0, import_drizzle_orm2.eq)(callLogs.id, id));
    return callLog || void 0;
  }
  async getCallLogsForUser(userId, limit = 50) {
    return db.select().from(callLogs).where((0, import_drizzle_orm2.or)((0, import_drizzle_orm2.eq)(callLogs.callerId, userId), (0, import_drizzle_orm2.eq)(callLogs.receiverId, userId))).orderBy((0, import_drizzle_orm2.desc)(callLogs.startedAt)).limit(limit);
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var import_express_session = __toESM(require("express-session"));
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET || "cleaner-phone-session-secret";
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app2.set("trust proxy", 1);
  }
  app2.use(
    (0, import_express_session.default)({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      proxy: isProduction,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1e3,
        sameSite: isProduction ? "none" : "lax"
      }
    })
  );
  app2.use(async (req, _res, next) => {
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  });
}
function isAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
function isSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Forbidden: Super admin access required" });
  }
  next();
}

// server/objectStorage.ts
var import_storage2 = require("@google-cloud/storage");
var import_crypto = require("crypto");
init_objectAcl();
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
function isReplitEnvironment() {
  return !!(process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN);
}
function createStorageClient() {
  if (isReplitEnvironment()) {
    return new import_storage2.Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token"
          }
        },
        universe_domain: "googleapis.com"
      },
      projectId: ""
    });
  }
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credJson) {
    try {
      const credentials = JSON.parse(credJson);
      return new import_storage2.Storage({
        credentials,
        projectId: credentials.project_id
      });
    } catch (e) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON. Set it to the contents of your GCS service account key file."
      );
    }
  }
  console.warn(
    "WARNING: No GCS credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON for image upload support."
  );
  return new import_storage2.Storage({});
}
var objectStorageClient = createStorageClient();
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path2) => path2.trim()).filter((path2) => path2.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a GCS bucket and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a GCS bucket and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a GCS bucket and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = (0, import_crypto.randomUUID)();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path2) {
  if (!path2.startsWith("/")) {
    path2 = `/${path2}`;
  }
  const pathParts = path2.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  if (isReplitEnvironment()) {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
    };
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to sign object URL via Replit sidecar, errorcode: ${response.status}`
      );
    }
    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
  const options = {
    version: "v4",
    action: method === "PUT" ? "write" : "read",
    expires: Date.now() + ttlSec * 1e3
  };
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  const [signedUrl] = await file.getSignedUrl(options);
  return signedUrl;
}

// server/routes.ts
init_objectAcl();
var import_zod2 = require("zod");
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValid = await storage.validatePassword(user, password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;
      await storage.updateUser(user.id, { isOnline: true, lastSeen: /* @__PURE__ */ new Date() });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", isAuthenticated, async (req, res) => {
    if (req.user) {
      await storage.updateUser(req.user.id, { isOnline: false, lastSeen: /* @__PURE__ */ new Date() });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", isAuthenticated, (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });
  app2.get("/api/users", isAuthenticated, async (req, res) => {
    const users2 = await storage.getAllUsers();
    const usersWithoutPasswords = users2.filter((u) => u.id !== req.user.id && u.role !== "super_admin").map(({ password: _, ...user }) => user);
    res.json(usersWithoutPasswords);
  });
  app2.post("/api/admin/users", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/admin/users", isAuthenticated, isSuperAdmin, async (_req, res) => {
    const users2 = await storage.getAllUsers();
    const usersWithoutPasswords = users2.map(({ password: _, ...user }) => user);
    res.json(usersWithoutPasswords);
  });
  app2.put("/api/admin/users/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    const user = await storage.updateUser(id, updates);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  app2.delete("/api/admin/users/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const deleted = await storage.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  });
  app2.get("/api/admin/locations", isAuthenticated, isSuperAdmin, async (_req, res) => {
    const locations = await storage.getUserLocations();
    res.json(locations.map(({ user, latitude, longitude }) => ({
      user: { id: user.id, displayName: user.displayName, username: user.username, isOnline: user.isOnline },
      latitude,
      longitude,
      lastUpdate: user.lastLocationUpdate
    })));
  });
  app2.get("/api/admin/conversations", isAuthenticated, isSuperAdmin, async (_req, res) => {
    const conversations2 = await storage.getAllConversationsWithDetails();
    res.json(conversations2.map((conv) => ({
      id: conv.id,
      participant1: {
        id: conv.participant1.id,
        displayName: conv.participant1.displayName,
        username: conv.participant1.username,
        isOnline: conv.participant1.isOnline
      },
      participant2: {
        id: conv.participant2.id,
        displayName: conv.participant2.displayName,
        username: conv.participant2.username,
        isOnline: conv.participant2.isOnline
      },
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        type: conv.lastMessage.type,
        content: conv.lastMessage.content,
        expiryType: conv.lastMessage.expiryType,
        createdAt: conv.lastMessage.createdAt,
        senderId: conv.lastMessage.senderId,
        isViewed: conv.lastMessage.isViewed
      } : null,
      lastMessageAt: conv.lastMessageAt,
      messageCount: conv.messageCount
    })));
  });
  app2.get("/api/admin/conversations/:id/messages", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const messages2 = await storage.getAllMessagesForConversation(id);
    res.json(messages2);
  });
  app2.post("/api/location", isAuthenticated, async (req, res) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Invalid location data" });
    }
    await storage.updateUserLocation(req.user.id, latitude, longitude);
    res.json({ success: true });
  });
  app2.get("/api/conversations", isAuthenticated, async (req, res) => {
    const conversations2 = await storage.getConversationsForUser(req.user.id);
    res.json(conversations2.map((conv) => ({
      id: conv.id,
      otherUser: {
        id: conv.otherUser.id,
        displayName: conv.otherUser.displayName,
        username: conv.otherUser.username,
        isOnline: conv.otherUser.isOnline
      },
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        type: conv.lastMessage.type,
        content: conv.lastMessage.content,
        expiryType: conv.lastMessage.expiryType,
        createdAt: conv.lastMessage.createdAt,
        senderId: conv.lastMessage.senderId,
        isViewed: conv.lastMessage.isViewed
      } : null,
      lastMessageAt: conv.lastMessageAt
    })));
  });
  app2.post("/api/conversations", isAuthenticated, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    let conversation = await storage.getConversationByParticipants(req.user.id, userId);
    if (!conversation) {
      conversation = await storage.createConversation(req.user.id, userId);
    }
    res.json(conversation);
  });
  app2.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (conversation.participant1Id !== req.user.id && conversation.participant2Id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteExpiredMessages();
    const messages2 = await storage.getMessages(id);
    res.json(messages2);
  });
  app2.post("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { type, content, imageUrl, expiryType, ciphertext, nonce, senderPublicKey, isEncrypted } = req.body;
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (conversation.participant1Id !== req.user.id && conversation.participant2Id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    const message = await storage.createMessage({
      conversationId: id,
      senderId: req.user.id,
      type: type || "text",
      content: isEncrypted ? null : content,
      imageUrl,
      expiryType: expiryType || "permanent",
      ciphertext: isEncrypted ? ciphertext : void 0,
      nonce: isEncrypted ? nonce : void 0,
      senderPublicKey: isEncrypted ? senderPublicKey : void 0,
      isEncrypted: isEncrypted || false
    });
    io.to(`conversation:${id}`).emit("new_message", message);
    res.status(201).json(message);
  });
  app2.put("/api/messages/:id/view", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const message = await storage.markMessageAsViewed(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.json(message);
  });
  app2.get("/api/keys/:userId", isAuthenticated, async (req, res) => {
    const { userId } = req.params;
    const key = await storage.getUserKey(userId);
    if (!key) {
      return res.status(404).json({ error: "Public key not found" });
    }
    res.json({ publicKey: key.publicKey });
  });
  app2.post("/api/keys", isAuthenticated, async (req, res) => {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== "string") {
      return res.status(400).json({ error: "publicKey is required" });
    }
    const key = await storage.setUserKey(req.user.id, publicKey);
    res.json({ publicKey: key.publicKey });
  });
  app2.get("/api/keys", isAuthenticated, async (req, res) => {
    const key = await storage.getUserKey(req.user.id);
    if (!key) {
      return res.status(404).json({ error: "Public key not found" });
    }
    res.json({ publicKey: key.publicKey });
  });
  app2.post("/api/security-events", isAuthenticated, async (req, res) => {
    const { eventType, details } = req.body;
    const validTypes = ["screenshot_attempt", "screen_recording_detected", "login_failed", "suspicious_activity"];
    if (!eventType || !validTypes.includes(eventType)) {
      return res.status(400).json({ error: "Invalid event type" });
    }
    const event = await storage.createSecurityEvent({
      userId: req.user.id,
      eventType,
      details,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"]
    });
    res.status(201).json(event);
  });
  app2.get("/api/admin/security-events", isAuthenticated, isSuperAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const events = await storage.getSecurityEvents(limit);
    res.json(events);
  });
  app2.post("/api/objects/upload", isAuthenticated, async (_req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });
  app2.put("/api/images", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: req.user.id,
          visibility: "public"
        }
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: req.user?.id,
        requestedPermission: "read" /* READ */
      });
      if (!canAccess) {
        const aclPolicy = await Promise.resolve().then(() => (init_objectAcl(), objectAcl_exports)).then((m) => m.getObjectAclPolicy(objectFile));
        if (!aclPolicy || aclPolicy.visibility !== "public") {
          return res.sendStatus(401);
        }
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  app2.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  const httpServer = (0, import_http.createServer)(app2);
  const io = new import_socket.Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("admin_request_camera", (data) => {
      console.log("Admin requesting camera from user:", data.userId, data.cameraType);
      io.emit(`camera_request:${data.userId}`, { cameraType: data.cameraType });
    });
    socket.on("admin_request_microphone", (data) => {
      console.log("Admin requesting microphone from user:", data.userId);
      io.emit(`microphone_request:${data.userId}`, {});
    });
    socket.on("admin_stop_camera", (data) => {
      console.log("Admin stopping camera for user:", data.userId);
      io.emit(`camera_stop:${data.userId}`, {});
    });
    socket.on("admin_stop_microphone", (data) => {
      console.log("Admin stopping microphone for user:", data.userId);
      io.emit(`microphone_stop:${data.userId}`, {});
    });
    socket.on("camera_stream", (data) => {
      console.log("Receiving camera stream from user:", data.userId);
      io.emit(`camera_stream:${data.adminId}`, { frame: data.frame, userId: data.userId });
    });
    socket.on("audio_stream", (data) => {
      console.log("Receiving audio stream from user:", data.userId);
      io.emit(`audio_stream:${data.adminId}`, { audio: data.audio, isRecording: data.isRecording, userId: data.userId });
    });
    socket.on("call_initiate", async (data) => {
      console.log("Call initiated from", data.callerId, "to", data.receiverId);
      const callLog = await storage.createCallLog(data.callerId, data.receiverId);
      io.emit(`incoming_call:${data.receiverId}`, {
        callId: callLog.id,
        callerId: data.callerId,
        callerName: data.callerName
      });
      socket.emit("call_created", { callId: callLog.id });
    });
    socket.on("call_accept", async (data) => {
      console.log("Call accepted:", data.callId);
      await storage.updateCallLog(data.callId, { status: "active", answeredAt: /* @__PURE__ */ new Date() });
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        io.emit(`call_accepted:${callLog.callerId}`, { callId: data.callId, receiverId: data.receiverId });
      }
    });
    socket.on("call_reject", async (data) => {
      console.log("Call rejected:", data.callId);
      await storage.updateCallLog(data.callId, { status: "rejected", endedAt: /* @__PURE__ */ new Date() });
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        io.emit(`call_rejected:${callLog.callerId}`, { callId: data.callId });
      }
    });
    socket.on("call_end", async (data) => {
      console.log("Call ended:", data.callId);
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        const duration = callLog.answeredAt ? Math.floor((Date.now() - callLog.answeredAt.getTime()) / 1e3) : 0;
        await storage.updateCallLog(data.callId, { status: "ended", endedAt: /* @__PURE__ */ new Date(), duration });
        const otherUserId = data.endedBy === callLog.callerId ? callLog.receiverId : callLog.callerId;
        io.emit(`call_ended:${otherUserId}`, { callId: data.callId, endedBy: data.endedBy });
      }
    });
    socket.on("call_audio", (data) => {
      io.emit(`call_audio:${data.receiverId}`, {
        callId: data.callId,
        senderId: data.senderId,
        audioData: data.audioData
      });
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
  return httpServer;
}

// server/index.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
async function runDatabaseMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("DATABASE_URL not set, skipping migrations");
    return;
  }
  try {
    console.log("Running database migrations...");
    (0, import_child_process.execSync)("npx drizzle-kit push --force", {
      env: { ...process.env },
      stdio: "inherit",
      timeout: 12e4
      // 2 minutes
    });
    console.log("Database migrations completed.");
  } catch (err) {
    console.error("Migration failed (server will still start):", err);
  }
}
var app = (0, import_express.default)();
var log = console.log;
async function seedSuperAdmin() {
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    const configuredPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!existingAdmin) {
      const password = configuredPassword || "admin123";
      await storage.createUser({
        username: "admin",
        password,
        displayName: "Super Admin",
        role: "super_admin"
      });
      log("Super admin account created successfully");
    } else {
      if (configuredPassword) {
        await storage.updateUserPassword(existingAdmin.id, configuredPassword);
        log("Super admin password updated from environment variable");
      } else {
        log("Super admin account already exists");
      }
    }
  } catch (error) {
    log("Error seeding super admin:", error);
  }
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    import_express.default.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", import_express.default.static(path.resolve(process.cwd(), "assets")));
  app2.use(import_express.default.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  await runDatabaseMigrations();
  await seedSuperAdmin();
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
