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
  // Set up authentication
  setupAuth(app);

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getAllUsers();
    // Don't send passwords or security answers
    const safeUsers = users.map(u => {
      const { password, securityAnswer, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  });

  // Groups
  app.post(api.groups.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { name, memberIds } = req.body;
    
    const group = await storage.createGroup(name, user.id);
    
    // Add other members
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
    const groups = await storage.getUserGroups(user.id);
    res.json(groups);
  });

  // Messages
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
      // TODO: Check if user is in group
      const msgs = await storage.getGroupMessages(groupId);
      return res.json(msgs);
    }

    res.json([]);
  });

  app.post(api.messages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.messages.create.input.parse(req.body);
    const message = await storage.createMessage(input);
    
    // Broadcast to WebSocket clients
    broadcastMessage(message);
    
    res.status(201).json(message);
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    // Only handle upgrades for /ws
    const { pathname } = parse(request.url || "", true);
    if (pathname === "/ws") {
      // In a real app, we would verify session here using sessionParser
      // For lite build, we'll let the client send an auth message
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws) => {
    let userId: number | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "auth") {
          userId = message.userId;
          if (userId) clients.set(userId, ws);
        }
      } catch (e) {
        console.error("WS Message error", e);
      }
    });

    ws.on("close", () => {
      if (userId) clients.delete(userId);
    });
  });

  function broadcastMessage(message: any) {
    // If group message, we'd need to find all members. 
    // For simplicity in Lite, broadcast to all connected clients and let frontend filter
    // OR if 1-on-1, send to receiver
    
    const payload = JSON.stringify({ type: "message", data: message });

    if (message.groupId) {
      // Ideally look up group members. Broadcast to all for now (simpler)
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    } else if (message.receiverId) {
      const receiverWs = clients.get(message.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(payload);
      }
      // Also send to sender (if they have multiple tabs or just for confirmation)
      const senderWs = clients.get(message.senderId);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(payload);
      }
    }
  }

  // Seed data if empty
  if (process.env.NODE_ENV !== "production") {
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      console.log("Seeding database...");
      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.hash("password123", 10);
      const hashedAns = await bcrypt.hash("blue", 10);
      
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
      console.log("Database seeded with users alice/password123 and bob/password123");
    }
  }

  return httpServer;
}
