# CipherChat - Secure Messaging Application

## Overview

CipherChat is a real-time secure messaging application with end-to-end encrypted personal and group chat functionality. The application features user authentication with security questions for password recovery, real-time messaging via WebSockets, typing indicators, online presence tracking, read receipts, and an admin dashboard for user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation
- **Real-time**: Custom WebSocket hook for live updates

The frontend follows a pages-based structure with shared components. Protected routes redirect unauthenticated users to the auth page. The layout shell provides consistent navigation across authenticated pages.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy and session-based auth
- **Password Hashing**: bcryptjs for secure password storage
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Real-time**: Native WebSocket server (ws library) attached to HTTP server

The server uses a storage abstraction layer (`IStorage` interface) that currently implements PostgreSQL storage. Routes are defined in a typed API contract (`shared/routes.ts`) that both client and server reference.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with push command (`db:push`)

Database tables:
- `users`: User accounts with security questions, online status, typing indicators
- `groups`: Chat groups with creator reference
- `group_members`: Many-to-many relationship for group membership
- `messages`: Messages with sender/receiver, delivery/read status, timestamps

### Authentication & Authorization
- Session-based authentication with secure cookies
- Password hashing with bcryptjs
- Security questions for password recovery
- Admin role for user management capabilities
- Protected API routes check `req.isAuthenticated()`

### Real-time Communication
WebSocket server handles:
- User online/offline status broadcasting
- Typing indicator updates
- New message notifications
- Message delivery and read receipt updates

Clients authenticate WebSocket connections by sending user ID after connection.

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Passport.js**: Authentication middleware
- **passport-local**: Username/password strategy
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI primitives for shadcn/ui components
- **date-fns**: Date formatting utilities
- **lucide-react**: Icon library
- **cmdk**: Command menu component

### Build Tools
- **Vite**: Frontend build and development server
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: (optional, has default) Secret for session encryption