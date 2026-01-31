import { db } from "./db";
import { users, groups, groupMembers, messages, type User, type InsertUser, type Group, type Message, type InsertMessage, type SafeUser } from "@shared/schema";
import { eq, or, and, inArray, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserSecurity(id: number, question: string, answer: string): Promise<void>;
  
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  promoteToAdmin(id: number): Promise<boolean>;
  
  updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void>;
  updateUserLastSeen(id: number): Promise<void>;
  updateUserTypingStatus(id: number, isTyping: boolean, typingTo?: number): Promise<void>;
  
  createGroup(name: string, createdBy: number): Promise<Group>;
  addGroupMember(groupId: number, userId: number): Promise<void>;
  getUserGroups(userId: number): Promise<(Group & { members: number[] })[]>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  getGroupMessages(groupId: number): Promise<Message[]>;
  
  markMessageDelivered(messageId: number): Promise<Message | undefined>;
  markMessageRead(messageId: number): Promise<Message | undefined>;
  markAllMessagesRead(recipientId: number, senderId: number): Promise<number>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  async updateUserSecurity(id: number, question: string, answer: string): Promise<void> {
    await db.update(users).set({ securityQuestion: question, securityAnswer: answer }).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async promoteToAdmin(id: number): Promise<boolean> {
    const result = await db.update(users).set({ isAdmin: true }).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    const updateData: any = { isOnline };
    if (!isOnline) {
      updateData.lastSeen = new Date();
      updateData.isTyping = false;
      updateData.typingTo = null;
    }
    await db.update(users).set(updateData).where(eq(users.id, id));
  }

  async updateUserLastSeen(id: number): Promise<void> {
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, id));
  }

  async updateUserTypingStatus(id: number, isTyping: boolean, typingTo?: number): Promise<void> {
    await db.update(users).set({ 
      isTyping, 
      typingTo: isTyping ? (typingTo || null) : null 
    }).where(eq(users.id, id));
  }

  async createGroup(name: string, createdBy: number): Promise<Group> {
    const [group] = await db.insert(groups).values({ name, createdBy }).returning();
    await this.addGroupMember(group.id, createdBy);
    return group;
  }

  async addGroupMember(groupId: number, userId: number): Promise<void> {
    await db.insert(groupMembers).values({ groupId, userId });
  }

  async getUserGroups(userId: number): Promise<(Group & { members: number[] })[]> {
    const userMemberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userMemberships.map(m => m.groupId);
    
    if (groupIds.length === 0) return [];

    const userGroups = await db.select().from(groups).where(inArray(groups.id, groupIds));
    
    const result = [];
    for (const group of userGroups) {
      const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, group.id));
      result.push({ ...group, members: members.map(m => m.userId) });
    }
    return result;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(userId1: number, userId2?: number): Promise<Message[]> {
    if (userId2 === undefined) {
      return await db.select().from(messages).where(
        or(
          eq(messages.senderId, userId1),
          eq(messages.receiverId, userId1)
        )
      ).orderBy(messages.createdAt);
    }
    return await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }

  async getGroupMessages(groupId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.groupId, groupId)).orderBy(messages.createdAt);
  }

  async markMessageDelivered(messageId: number): Promise<Message | undefined> {
    const [message] = await db.update(messages)
      .set({ isDelivered: true, deliveredAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async markMessageRead(messageId: number): Promise<Message | undefined> {
    const [message] = await db.update(messages)
      .set({ isRead: true, readAt: new Date(), isDelivered: true, deliveredAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async markAllMessagesRead(recipientId: number, senderId: number): Promise<number> {
    const result = await db.update(messages)
      .set({ isRead: true, readAt: new Date(), isDelivered: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, recipientId),
          eq(messages.isRead, false)
        )
      )
      .returning();
    return result.length;
  }
}

export const storage = new DatabaseStorage();
