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

### Project Structure & Architecture Decisions

#### Module Architecture

Each module follows a consistent structure:

```
src/app/(module)/
├── public/
│   └── index.js         # Public API surface (exports only)
├── domain/               # Business logic layer
│   └── *.js
├── data-access/          # Data layer (optional, not all modules have this)
│   └── *.js
└── page.jsx             # Module entry point (optional, for modules with UI)
```

#### Key Architecture Rules

1. **API Routes**: Centralized in `src/app/api/` following pattern `api/(module)/(endpoint)/route.js`
   - No API folders within individual modules
   - All routes moved to centralized API folder

2. **Module Boundaries**:
   - Each module surfaces a public API through `public/index.js`
   - Other modules import ONLY from the public API: `@/app/(module)/public`
   - Direct imports from domain or data-access layers are forbidden
   - Domain layer contains business logic, services, and core functionality
   - Data-access layer handles data operations when present

3. **Shared Functionality**:
   - Located in `src/lib/` as packages
   - Examples: `llm-client`, `file-parser`
   - Used across multiple modules for common functionality

#### Current Module Structure

- **extraction**: Has public API, domain layer
- **evaluation**: Has public API, domain layer
- **upload**: Has domain layer, page.jsx (no public folder needed per requirements)
- **review**: Has page.jsx, utils (no public folder needed per requirements)

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
