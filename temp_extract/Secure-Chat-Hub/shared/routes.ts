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
      path: '/api/messages', // Query params: userId or groupId
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
