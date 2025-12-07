# Cleaner Phone

## Overview

Cleaner Phone is a corporate security monitoring application built with React Native (Expo) and Express. It provides secure messaging with self-destructing messages, real-time location tracking, and camera/microphone access for corporate monitoring purposes. The system uses a super admin-controlled user management model where users cannot self-register.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 with Native Stack Navigator
  - Authentication flow separates logged-in/logged-out states
  - Screen stack: Login → Conversations → Chat/NewChat/Profile
  - Modal-based timer selector for message expiry settings
  
**State Management**: 
- TanStack Query (React Query) for server state and caching
  - 5-second polling on conversations list for real-time updates
  - Optimistic updates for message sending
- React Context for authentication state with AsyncStorage persistence

**UI/Theming**:
- Custom design system with light/dark mode support
- Theme constants define colors, spacing, typography, and shadows
- Platform-specific adaptations (iOS blur effects, Android edge-to-edge)
- Reanimated v2 for smooth animations and gestures

**Key Features**:
- Self-destructing messages with configurable expiry (view once, 1 min, 1 hour, 24 hours, permanent)
- Image upload with blur-to-reveal for unviewed messages
- Background location tracking (30-second intervals for non-admin users)
- System-generated avatars from user initials with gradient backgrounds

### Backend Architecture

**Framework**: Express.js with TypeScript
- RESTful API design pattern
- Session-based authentication using express-session
- CORS configured for Replit deployment domains

**Database Layer**:
- Drizzle ORM with PostgreSQL dialect
- Schema-first approach with Zod validation
- Migrations managed via drizzle-kit

**Core Services**:
1. **Storage Service**: Abstraction layer for database operations (users, conversations, messages, locations)
2. **Auth Service**: Session management, password hashing (bcryptjs), role-based access control
3. **Object Storage Service**: Google Cloud Storage integration for image uploads with ACL policies
4. **WebSocket Service**: Socket.IO for real-time message delivery and typing indicators (infrastructure present)

**Security**:
- Password hashing with bcryptjs (salt rounds configurable)
- Session secret from environment variables
- Middleware for authentication (`isAuthenticated`) and authorization (`isSuperAdmin`)
- ACL-based object access control with ownership and visibility policies

### Database Schema

**Tables**:
1. **users**: User accounts with role-based access (user/super_admin), online status, location tracking fields
2. **conversations**: 1-on-1 chat conversations with participant references and last message tracking
3. **messages**: Chat messages with type (text/image), expiry settings, view status, and soft deletion
4. **remote_access_sessions**: Session tracking for corporate monitoring features

**Key Relationships**:
- Users ↔ Conversations: Many-to-many through participant foreign keys
- Conversations ↔ Messages: One-to-many with cascade deletion
- Messages track sender and expiry with automatic cleanup via cron job

**Enums**:
- user_role: `user`, `super_admin`
- message_type: `text`, `image`
- message_expiry: `view_once`, `1_minute`, `1_hour`, `24_hours`, `permanent`

### External Dependencies

**Third-Party Services**:
- **Google Cloud Storage**: Object storage for image uploads via Replit sidecar authentication
  - Presigned URL generation for client-side uploads
  - Custom ACL policy system for access control
  
**Deployment Platform**: Replit
- Environment variables: `REPLIT_DEV_DOMAIN`, `REPLIT_INTERNAL_APP_DOMAIN`
- Sidecar endpoint for GCS authentication: `http://127.0.0.1:1106`
- Build system with separate Expo static build and server bundling (esbuild)

**Key NPM Packages**:
- **expo-camera**, **expo-location**, **expo-image-picker**: Device permissions and media access
- **react-native-reanimated**: Animation library for smooth UI interactions
- **react-native-keyboard-controller**: Keyboard-aware scrolling for text inputs
- **socket.io**: Real-time bidirectional communication (client integration pending)
- **drizzle-orm**, **drizzle-zod**: Type-safe database access with schema validation

**Development Tools**:
- TypeScript with strict mode enabled
- ESLint with Expo config and Prettier integration
- Path aliases: `@/` → client, `@shared/` → shared schema/types