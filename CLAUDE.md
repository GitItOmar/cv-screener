# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CV screening application built with Next.js 15 and React 19. The application allows users to bulk upload CVs, have them pre-screened by AI, and then review candidates through a swipe-based interface.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router (React 19)
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **State Management**: React hooks (useState, useEffect)
- **File Storage**: Vercel Blob storage
- **Icons**: Lucide React

### Project Structure

- `/app/` - Next.js App Router pages and API routes
  - `/upload/` - CV upload functionality with drag-and-drop
  - `/review/` - Candidate review interface with swipe controls
  - `route.js` - Upload API endpoint for Vercel Blob
- `/components/ui/` - Reusable shadcn/ui components
- `/hooks/` - Custom React hooks (toast notifications)
- `/lib/` - Utility functions

### Key Features

1. **Bulk CV Upload**: Supports PDF, DOC, DOCX, ZIP, CSV files up to 10MB each (max 200 files)
2. **AI Pre-screening**: Mock scoring system (real implementation would integrate with AI service)
3. **Swipe Review Interface**: Keyboard shortcuts (←/→ for reject/accept, U for undo, S for skip)
4. **GDPR Compliance**: User consent checkbox and data protection features

### Component Architecture

- Uses shadcn/ui component library with "new-york" style variant
- Components are in JSX format (not TypeScript)
- Tailwind CSS for styling with CSS variables
- Responsive design with mobile drawer for candidate details

### State Management Patterns

- Local component state with useState
- Toast notifications via custom hook
- File upload progress tracking
- History tracking for undo functionality

### File Upload Flow

1. Client-side validation (file type, size, duplicates)
2. FormData submission to `/api/upload` endpoint
3. Integration with Vercel Blob storage
4. Progress tracking and error handling

### Important Notes

- The app uses mock data for candidate reviews
- Upload route exists but needs proper API implementation
- No authentication system currently implemented
- Uses client-side routing with Next.js App Router
