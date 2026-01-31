import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const clients = new Map<number, WebSocket>();
  const wss = new WebSocketServer({ noServer: true });

  function broadcast(type: string, data: any, targetUserIds?: number[]) {
    const payload = JSON.stringify({ type, data });
    if (targetUserIds) {
      targetUserIds.forEach(userId => {
        const ws = clients.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    } else {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const allUsers = await storage.getAllUsers();
    const safeUsers = allUsers.map(u => {
      const { password, securityAnswer, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  });

  app.get(api.admin.getAllUsersActivity.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.isAdmin) return res.status(403).json({ message: "Admin access required" });
    
    const allUsers = await storage.getAllUsers();
    const activity = allUsers.map(u => ({
      id: u.id,
      username: u.username,
      isOnline: u.isOnline || false,
      lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
      isTyping: u.isTyping || false,
    }));
    res.json(activity);
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.isAdmin) return res.status(403).json({ message: "Admin access required" });
    
    const targetId = parseInt(req.params.id);
    if (targetId === user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }
    
    const deleted = await storage.deleteUser(targetId);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    
    broadcast("user_deleted", { userId: targetId });
    res.json({ message: "User deleted successfully" });
  });

  app.post("/api/admin/users/:id/promote", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.isAdmin) return res.status(403).json({ message: "Admin access required" });
    
    const targetId = parseInt(req.params.id);
    const promoted = await storage.promoteToAdmin(targetId);
    if (!promoted) return res.status(404).json({ message: "User not found" });
    
    res.json({ message: "User promoted to admin" });
  });

  app.post(api.groups.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { name, memberIds } = req.body;
    
    const group = await storage.createGroup(name, user.id);
    
    for (const memberId of memberIds) {
      if (memberId !== user.id) {
        await storage.addGroupMember(group.id, memberId);
      }
    }
    
    res.status(201).json(group);
  });

  app.get(api.groups.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const userGroups = await storage.getUserGroups(user.id);
    res.json(userGroups);
  });

  app.get(api.messages.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;

    if (userId) {
      const msgs = await storage.getMessages(user.id, userId);
      return res.json(msgs);
    }
    
    if (groupId) {
      const msgs = await storage.getGroupMessages(groupId);
      return res.json(msgs);
    }

    // Return all messages for the current user to build sidebar metadata
    const allMessages = await storage.getMessages(user.id, undefined as any); // Modified storage to handle single user
    res.json(allMessages);
  });

  app.post(api.messages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.messages.create.input.parse(req.body);
    const message = await storage.createMessage(input);
    
    const payload = { type: "message", data: message };
    
    if (message.groupId) {
      broadcast("message", message);
    } else if (message.receiverId) {
      broadcast("message", message, [message.senderId, message.receiverId]);
      broadcast("notification", { 
        type: "new_message",
        senderId: message.senderId,
        preview: message.content.substring(0, 50)
      }, [message.receiverId]);
    }
    
    res.status(201).json(message);
  });

  app.post("/api/messages/:id/delivered", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messageId = parseInt(req.params.id);
    const message = await storage.markMessageDelivered(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    broadcast("message_delivered", { messageId: message.id, deliveredAt: message.deliveredAt }, [message.senderId]);
    res.json(message);
  });

  app.post("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messageId = parseInt(req.params.id);
    const message = await storage.markMessageRead(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    broadcast("message_read", { messageId: message.id, readAt: message.readAt }, [message.senderId]);
    res.json(message);
  });

  app.post(api.messages.markAllRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { senderId } = req.body;
    
    const count = await storage.markAllMessagesRead(user.id, senderId);
    broadcast("messages_read", { recipientId: user.id, senderId, count }, [senderId]);
    res.json({ count });
  });

  app.post(api.activity.setTyping.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { isTyping, recipientId } = req.body;
    
    await storage.updateUserTypingStatus(user.id, isTyping, recipientId);
    
    if (recipientId) {
      broadcast("typing", { userId: user.id, isTyping }, [recipientId]);
    }
    
    res.json({ success: true });
  });

  app.post(api.activity.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { isOnline } = req.body;
    
    await storage.updateUserOnlineStatus(user.id, isOnline);
    broadcast("status", { userId: user.id, isOnline, lastSeen: new Date().toISOString() });
    
    res.json({ success: true });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws) => {
    let userId: number | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "auth") {
          userId = message.userId;
          if (userId) {
            clients.set(userId, ws);
            await storage.updateUserOnlineStatus(userId, true);
            broadcast("status", { userId, isOnline: true });
          }
        }
        
        if (message.type === "typing" && userId) {
          await storage.updateUserTypingStatus(userId, message.isTyping, message.recipientId);
          if (message.recipientId) {
            broadcast("typing", { userId, isTyping: message.isTyping }, [message.recipientId]);
          }
        }
        
        if (message.type === "mark_delivered" && userId && message.messageId) {
          const msg = await storage.markMessageDelivered(message.messageId);
          if (msg) {
            broadcast("message_delivered", { messageId: msg.id, deliveredAt: msg.deliveredAt }, [msg.senderId]);
          }
        }
        
        if (message.type === "mark_read" && userId && message.messageId) {
          const msg = await storage.markMessageRead(message.messageId);
          if (msg) {
            broadcast("message_read", { messageId: msg.id, readAt: msg.readAt }, [msg.senderId]);
          }
        }
      } catch (e) {
        console.error("WS Message error", e);
      }
    });

    ws.on("close", async () => {
      if (userId) {
        clients.delete(userId);
        await storage.updateUserOnlineStatus(userId, false);
        broadcast("status", { userId, isOnline: false, lastSeen: new Date().toISOString() });
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const allUsers = await storage.getAllUsers();
    if (allUsers.length === 0 || !allUsers.find(u => u.username === "admin")) {
      console.log("Seeding database...");
      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.hash("password123", 10);
      const hashedAns = await bcrypt.hash("blue", 10);
      
      // Clear existing to avoid partial seeds
      // await db.delete(users); 

      await storage.createUser({
        username: "admin",
        password: await bcrypt.hash("admin123", 10),
        securityQuestion: "What is your role?",
        securityAnswer: await bcrypt.hash("admin", 10)
      });
      
      const admin = await storage.getUserByUsername("admin");
      if (admin) {
        await storage.promoteToAdmin(admin.id);
      }
      
      await storage.createUser({
        username: "alice",
        password: hashed,
        securityQuestion: "What is your favorite color?",
        securityAnswer: hashedAns
      });
      
      await storage.createUser({
        username: "bob",
        password: hashed,
        securityQuestion: "What is your favorite color?",
        securityAnswer: hashedAns
      });
      
      console.log("Database seeded:");
      console.log("  Admin: admin/admin123");
      console.log("  Users: alice/password123, bob/password123");
    }
  }

  return httpServer;
}
