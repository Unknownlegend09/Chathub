import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  securityQuestion: text("security_question").notNull(),
  securityAnswer: text("security_answer").notNull(),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
  isTyping: boolean("is_typing").default(false),
  typingTo: integer("typing_to"),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: integer("created_by"),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id"),
  groupId: integer("group_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isDelivered: boolean("is_delivered").default(false),
  isRead: boolean("is_read").default(false),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, isOnline: true, lastSeen: true, isAdmin: true, isTyping: true, typingTo: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isDelivered: true, isRead: true, deliveredAt: true, readAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type SafeUser = Omit<User, 'password' | 'securityAnswer'>;
