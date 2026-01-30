import { db } from "./db";
import { users, groups, groupMembers, messages, type User, type InsertUser, type Group, type Message, type InsertMessage } from "@shared/schema";
import { eq, or, and, inArray } from "drizzle-orm";
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
  
  createGroup(name: string, createdBy: number): Promise<Group>;
  addGroupMember(groupId: number, userId: number): Promise<void>;
  getUserGroups(userId: number): Promise<(Group & { members: number[] })[]>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  getGroupMessages(groupId: number): Promise<Message[]>;
  
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

  async createGroup(name: string, createdBy: number): Promise<Group> {
    const [group] = await db.insert(groups).values({ name }).returning();
    // Add creator as member
    await this.addGroupMember(group.id, createdBy);
    return group;
  }

  async addGroupMember(groupId: number, userId: number): Promise<void> {
    await db.insert(groupMembers).values({ groupId, userId });
  }

  async getUserGroups(userId: number): Promise<(Group & { members: number[] })[]> {
    // Get all groups where user is a member
    const userMemberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userMemberships.map(m => m.groupId);
    
    if (groupIds.length === 0) return [];

    const userGroups = await db.select().from(groups).where(inArray(groups.id, groupIds));
    
    // For each group, fetch all members (this is N+1 but fine for lite scale)
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

  async getMessages(userId1: number, userId2: number): Promise<Message[]> {
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
}

export const storage = new DatabaseStorage();
