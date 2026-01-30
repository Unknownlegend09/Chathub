import { z } from 'zod';
import { insertUserSchema, insertGroupSchema, insertMessageSchema, users, groups, messages } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    updatePassword: {
      method: 'POST' as const,
      path: '/api/update-password',
      input: z.object({
        username: z.string(),
        securityAnswer: z.string(),
        newPassword: z.string(),
        newSecurityQuestion: z.string().optional(),
        newSecurityAnswer: z.string().optional(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
  },
  admin: {
    deleteUser: {
      method: 'DELETE' as const,
      path: '/api/admin/users/:id',
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    getAllUsersActivity: {
      method: 'GET' as const,
      path: '/api/admin/users/activity',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          username: z.string(),
          isOnline: z.boolean(),
          lastSeen: z.string().nullable(),
          isTyping: z.boolean(),
        })),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
      },
    },
    promoteToAdmin: {
      method: 'POST' as const,
      path: '/api/admin/users/:id/promote',
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  groups: {
    create: {
      method: 'POST' as const,
      path: '/api/groups',
      input: z.object({
        name: z.string(),
        memberIds: z.array(z.number()),
      }),
      responses: {
        201: z.custom<typeof groups.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/groups',
      responses: {
        200: z.array(z.custom<typeof groups.$inferSelect & { members: number[] }>()),
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/messages',
      input: z.object({
        userId: z.string().optional(),
        groupId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/messages',
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
    markDelivered: {
      method: 'POST' as const,
      path: '/api/messages/:id/delivered',
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/messages/:id/read',
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    markAllRead: {
      method: 'POST' as const,
      path: '/api/messages/read-all',
      input: z.object({
        senderId: z.number(),
      }),
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
  },
  activity: {
    setTyping: {
      method: 'POST' as const,
      path: '/api/activity/typing',
      input: z.object({
        isTyping: z.boolean(),
        recipientId: z.number().optional(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    updateStatus: {
      method: 'POST' as const,
      path: '/api/activity/status',
      input: z.object({
        isOnline: z.boolean(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
