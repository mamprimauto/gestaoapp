# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 task management dashboard application built with TypeScript and Supabase. The app features a sidebar layout with department-based task organization and real-time collaboration capabilities.

## Common Development Commands

```bash
# Development
npm run dev          # Start development server
pnpm dev            # Alternative with pnpm (pnpm-lock.yaml present)

# Build and Production
npm run build       # Build for production
npm run start       # Start production server

# Code Quality
npm run lint        # Run ESLint (lint errors ignored during builds in next.config.mjs)
```

## Architecture Overview

### Frontend Stack
- **Next.js 14** with App Router
- **TypeScript** with relaxed build settings (errors ignored in production)
- **Tailwind CSS** v4 for styling
- **shadcn/ui** component library (New York style, RSC enabled)
- **Lucide React** for icons

### Database & Backend
- **Supabase** for database, auth, and real-time features
- **PostgreSQL** with Row Level Security (RLS) enabled
- **Real-time subscriptions** for live task updates
- Database migrations located in `scripts/db/` (numbered SQL files)

### Key Components Architecture

#### Authentication & User Management
- Client-side Supabase auth with session persistence
- User profiles stored in `profiles` table with avatar support
- Row Level Security ensures users only see their own tasks

#### Task Management System
- Tasks belong to departments: "copy", "edicao", "gestor", "particular"
- Task statuses: "pending", "in-progress", "done"
- Priority levels: "low", "med", "high"
- Optional assignee system (backward compatible)
- File attachments support via Supabase Storage

#### Real-time Features
- Live task updates using Supabase real-time channels
- Optimistic UI updates with fallback error handling
- Task completion percentage calculations

### File Structure Patterns

#### Database Layer
- `lib/supabase/client.ts` - Client-side Supabase instance with retry logic
- `lib/supabase/server.ts` - Server-side Supabase for API routes
- `scripts/db/` - Numbered SQL migration files

#### State Management
- `components/task-data.tsx` - Main task data provider with React Context
- Global state via TaskDataProvider wrapping the app
- Real-time sync between database and local state

#### UI Components
- `components/ui/` - shadcn/ui base components
- `components/` - Custom business logic components
- Sidebar navigation with department filtering
- Sheet-based task detail views

### Important Implementation Details

#### Supabase Configuration
- Environment variables handled via both Next.js public vars and runtime API
- Fallback mechanism for missing environment variables
- Custom fetch wrapper with retry logic for network stability

#### Department System
- Department filtering via `lib/departments.ts`
- Tasks tagged by department except "particular" (user-specific)
- Assignee system optional and backward compatible

#### File Uploads
- Task file attachments via Supabase Storage
- Secure upload URLs with expiration
- RLS policies protect file access

### Development Notes

- ESLint and TypeScript errors are ignored during builds
- Images are unoptimized for deployment flexibility
- Portuguese language support (lang="pt-BR")
- Dark theme as default with system preference support