# CV Screening Application

A modern web application for bulk CV upload and AI-powered candidate screening with an intuitive review interface.

## Features

- **Bulk CV Upload**: Support for PDF, DOC, DOCX, ZIP, and CSV files
- **AI-Powered Screening**: Automated extraction and analysis of candidate data
- **Interactive Review**: Swipe-based interface for efficient candidate review
- **GDPR Compliant**: Built-in data protection and consent management

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19 + Tailwind CSS + shadcn/ui
- **AI**: OpenAI API for CV data extraction
- **File Storage**: Vercel Blob (configurable)
- **Styling**: Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your OpenAI API key and other required variables.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

See `.env.example` for required environment variables. Key variables include:

- `OPENAI_API_KEY` - Required for AI-powered CV data extraction

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Code Quality

This project includes:

- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks
- lint-staged for pre-commit checks

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── upload/            # CV upload pages
│   └── review/            # Candidate review interface
├── components/ui/         # Reusable UI components
├── lib/                   # Utilities and services
│   ├── agents/           # AI processing agents
│   ├── extractors/       # Text extraction utilities
│   └── parsers/          # File parsing utilities
└── hooks/                # Custom React hooks
```

## Usage

1. **Upload CVs**: Navigate to the upload page and drag & drop CV files
2. **AI Processing**: CVs are automatically processed and structured data is extracted
3. **Review Candidates**: Use the review interface to evaluate candidates with keyboard shortcuts:
   - `←` or `→` - Reject/Accept candidate
   - `U` - Undo last action
   - `S` - Skip candidate

## Configuration

The application can be configured through:

- Environment variables (see `.env.example`)
- CLAUDE.md for development guidance
- Package.json scripts for build processes

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Ensure all tests pass before committing
3. Use conventional commit messages
4. Update documentation as needed
