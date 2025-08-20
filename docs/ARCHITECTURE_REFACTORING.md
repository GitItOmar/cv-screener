# Architecture Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan to transform the current CV screening application into a modular, scalable architecture following Node.js best practices. The refactoring is based on two key principles:

1. **Component-Based Architecture**: Breaking the application into self-contained business components
2. **3-Layer Architecture**: Implementing clear separation of concerns within each component

## Current Architecture Analysis

### Current Issues

- **Monolithic Structure**: Business logic mixed with framework code
- **Unclear Boundaries**: No clear separation between different business domains
- **Technical Grouping**: Files organized by technical role rather than business function
- **Tight Coupling**: Direct dependencies between layers making testing difficult
- **Framework Lock-in**: Business logic tied to Next.js specific implementations

### Current Structure

```
src/
├── app/                 # Next.js pages and API routes
├── components/ui/       # UI components
├── lib/                # Mixed business logic
│   ├── parsers/
│   ├── extractors/
│   ├── validators/
│   ├── agents/
│   └── services/
└── hooks/              # React hooks
```

## Proposed Architecture

### Core Principles

Based on [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) adapted for Next.js 15:

1. **Feature Cohesion**: All feature code stays together in one place
2. **3-Tier Architecture**: Entry Points → Domain → Data Access
3. **Co-location**: Related code lives in the same directory
4. **Next.js Conventions**: Follow App Router patterns
5. **Simple Naming**: Clean, descriptive names without complex suffixes

### New Project Structure

```
screening/
├── src/
│   ├── app/                      # Next.js App Router + Features
│   │   ├── upload/               # Upload Feature (file handling)
│   │   │   ├── page.jsx          # UI entry point
│   │   │   ├── api/
│   │   │   │   └── route.js      # API entry point
│   │   │   ├── components/       # Feature UI components
│   │   │   │   ├── DropZone.jsx
│   │   │   │   └── FileList.jsx
│   │   │   ├── domain/           # Business logic
│   │   │   │   ├── uploader.js   # Upload orchestration
│   │   │   │   ├── validator.js  # File validation
│   │   │   │   └── processor.js  # File processing
│   │   │   └── data/             # Data access layer
│   │   │       ├── repository.js # Upload metadata persistence
│   │   │       └── storage.js    # File storage adapter
│   │   │
│   │   ├── extraction/           # Extraction Feature (data parsing)
│   │   │   ├── api/
│   │   │   │   └── route.js      # API entry point
│   │   │   ├── domain/           # Business logic
│   │   │   │   ├── extractor.js  # Main extraction orchestration
│   │   │   │   ├── parser.js     # Text parsing logic
│   │   │   │   ├── llm.js        # LLM-based extraction
│   │   │   │   └── transformer.js # Data transformation
│   │   │   └── data/             # Data access layer
│   │   │       ├── repository.js # Extracted data persistence
│   │   │       └── cache.js      # Extraction cache
│   │   │
│   │   ├── review/               # Review Feature (all layers)
│   │   │   ├── page.jsx          # UI entry point
│   │   │   ├── api/
│   │   │   │   └── route.js      # API entry point
│   │   │   ├── components/       # Feature UI components
│   │   │   │   ├── CandidateCard.jsx
│   │   │   │   ├── SwipeInterface.jsx
│   │   │   │   └── ReviewStats.jsx
│   │   │   ├── domain/           # Business logic
│   │   │   │   ├── reviewer.js   # Review orchestration
│   │   │   │   ├── scoring.js    # Scoring logic
│   │   │   │   └── workflow.js   # Review workflow
│   │   │   └── data/             # Data access layer
│   │   │       ├── repository.js # Candidate persistence
│   │   │       └── queries.js    # Data queries
│   │   │
│   │   ├── evaluation/           # Evaluation Feature (all layers)
│   │   │   ├── api/
│   │   │   │   └── route.js      # API entry point
│   │   │   ├── domain/           # Business logic
│   │   │   │   ├── evaluator.js  # Main evaluation logic
│   │   │   │   ├── agents/       # AI agents
│   │   │   │   │   ├── resume.js
│   │   │   │   │   ├── ceo.js
│   │   │   │   │   ├── cto.js
│   │   │   │   │   └── hr.js
│   │   │   │   └── rag.js        # RAG implementation
│   │   │   └── data/             # Data access layer
│   │   │       ├── vectors.js    # Vector store operations
│   │   │       └── repository.js # Evaluation persistence
│   │   │
│   │   └── layout.jsx            # Root layout
│   │
│   ├── lib/                      # Shared infrastructure only
│   │   ├── db/                   # Database clients
│   │   │   └── chromadb.js      # ChromaDB client singleton
│   │   ├── ai/                   # AI clients
│   │   │   └── openai.js        # OpenAI client singleton
│   │   ├── storage/              # Storage clients
│   │   │   └── blob.js          # Vercel Blob client
│   │   ├── parsers/              # Generic parsers (utilities)
│   │   │   ├── pdf.js
│   │   │   ├── docx.js
│   │   │   ├── csv.js
│   │   │   └── factory.js
│   │   └── utils/                # Generic utilities
│   │       ├── errors.js
│   │       ├── logger.js
│   │       └── formatters.js
│   │
│   ├── components/               # Shared UI components only
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       └── ...
│   │
│   └── hooks/                    # Shared React hooks
│       └── use-toast.js
│
├── public/                       # Static assets
├── scripts/                      # Development scripts
└── docs/                        # Documentation
```

## Architecture Layers (Per Feature)

Each feature in the `app/` directory follows the same 3-tier architecture:

### 1. Entry Points Layer

**Locations**:

- `app/[feature]/page.jsx` - UI entry point
- `app/[feature]/api/route.js` - API entry point
- `app/[feature]/components/` - Feature-specific UI

**Responsibilities**:

- Handle HTTP requests/responses
- Validate input format
- Transform data for domain layer
- Render UI and handle user interactions
- Delegate to domain layer for business logic

### 2. Domain Layer

**Location**: `app/[feature]/domain/`

**Responsibilities**:

- Core business logic and rules
- Workflow orchestration
- Business validations
- Domain entities and value objects
- Use case implementation

**Key Principles**:

- Protocol agnostic (no HTTP concerns)
- Framework independent
- Pure business logic

### 3. Data Access Layer

**Location**: `app/[feature]/data/`

**Responsibilities**:

- Database operations
- External API calls
- File storage operations
- Data transformation to/from domain objects
- Query optimization

**Key Principles**:

- Returns domain objects, not raw data
- Abstracts storage details
- Handles data persistence

### 4. Shared Infrastructure

**Location**: `src/lib/`

**Responsibilities**:

- Client singletons (DB, AI, Storage)
- Generic utilities and helpers
- Cross-feature parsers
- Common error handling

**Key Principles**:

- Only truly shared code
- No feature-specific logic
- Configured once, used everywhere

## Migration Strategy

### Phase 1: Setup Infrastructure Layer (Day 1)

- [ ] Create `lib/db/chromadb.js` with singleton client
- [ ] Create `lib/ai/openai.js` with singleton client
- [ ] Create `lib/storage/blob.js` for file storage
- [ ] Simplify parser naming in `lib/parsers/`

### Phase 2: Reorganize Upload Feature (Day 2)

- [ ] Move API route from `app/api/upload/` to `app/upload/api/`
- [ ] Create `app/upload/domain/` directory
- [ ] Move file validation logic to upload domain
- [ ] Create `app/upload/data/` for file storage
- [ ] Focus upload on file handling only

### Phase 3: Create Extraction Feature (Day 3)

- [ ] Create `app/extraction/api/route.js`
- [ ] Create `app/extraction/domain/` directory
- [ ] Move text extractors to extraction domain
- [ ] Move LLM extraction logic to extraction domain
- [ ] Create `app/extraction/data/` for extracted data persistence

### Phase 4: Reorganize Evaluation Feature (Day 4-5)

- [ ] Create `app/evaluation/api/route.js`
- [ ] Create `app/evaluation/domain/` with agents
- [ ] Move vector store logic to `app/evaluation/data/`
- [ ] Migrate agent logic to evaluation domain

### Phase 5: Reorganize Review Feature (Day 6)

- [ ] Keep review page in place
- [ ] Create `app/review/domain/` for business logic
- [ ] Create `app/review/data/` for data access
- [ ] Extract review logic from components

### Phase 6: Cleanup & Testing (Day 7-8)

- [ ] Remove old service directories
- [ ] Update all import paths
- [ ] Test each feature independently
- [ ] Update documentation

## File Movement Mapping

### Current → New Location

| Current File                         | New Location                                | Layer                   |
| ------------------------------------ | ------------------------------------------- | ----------------------- |
| `lib/parsers/pdfParser.js`           | `lib/parsers/pdf.js`                        | Shared Infrastructure   |
| `lib/parsers/docxParser.js`          | `lib/parsers/docx.js`                       | Shared Infrastructure   |
| `lib/parsers/csvParser.js`           | `lib/parsers/csv.js`                        | Shared Infrastructure   |
| `lib/parsers/parserFactory.js`       | `lib/parsers/factory.js`                    | Shared Infrastructure   |
| `lib/extractors/textExtractor.js`    | `app/extraction/domain/parser.js`           | Extraction Domain Layer |
| `lib/extractors/llmExtractor.js`     | Split into:                                 |                         |
|                                      | `lib/ai/openai.js`                          | Shared Infrastructure   |
|                                      | `app/extraction/domain/llm.js`              | Extraction Domain Layer |
| `lib/validators/dataValidator.js`    | `app/extraction/domain/transformer.js`      | Extraction Domain Layer |
| `lib/agents/resumeAgent.js`          | `app/evaluation/domain/agents/resume.js`    | Evaluation Domain       |
| `lib/agents/promptTemplates.js`      | `app/evaluation/domain/agents/templates.js` | Evaluation Domain       |
| `lib/services/vectorStoreGeneric.js` | `lib/db/chromadb.js`                        | Shared Infrastructure   |
| `lib/services/resumeVectorStore.js`  | `app/evaluation/data/vectors.js`            | Evaluation Data Layer   |
| `components/ui/*`                    | `components/ui/*`                           | Keep in place           |
| `hooks/use-toast.js`                 | `hooks/use-toast.js`                        | Keep in place           |
| `lib/utils.js`                       | `lib/utils/formatters.js`                   | Shared Infrastructure   |
| `app/upload/page.jsx`                | `app/upload/page.jsx`                       | Upload Entry Point      |
| `app/review/page.jsx`                | `app/review/page.jsx`                       | Review Entry Point      |
| `app/api/upload/route.js`            | `app/upload/api/route.js`                   | Upload Entry Point      |

## New Files to Create

### Entry Point Layer (API Route)

```javascript
// app/upload/api/route.js
import { processFile } from '../domain/processor';

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  // Thin handler - delegate to domain
  const result = await processFile(file);

  return Response.json(result);
}
```

### Domain Layer (Upload Feature)

```javascript
// app/upload/domain/uploader.js
import { validateFile } from './validator';
import { processFile } from './processor';
import { storeFile } from '../data/storage';

export async function handleUpload(file) {
  // Validate the file
  const validation = await validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Process and store
  const processed = await processFile(file);
  const stored = await storeFile(processed);

  return {
    fileId: stored.id,
    metadata: stored.metadata,
  };
}
```

### Domain Layer (Extraction Feature)

```javascript
// app/extraction/domain/extractor.js
import { parseText } from './parser';
import { extractWithLLM } from './llm';
import { transformData } from './transformer';
import { saveExtraction } from '../data/repository';

export async function extractFromFile(fileId) {
  // Get file content
  const content = await getFileContent(fileId);

  // Parse and extract
  const parsed = await parseText(content);
  const extracted = await extractWithLLM(parsed);
  const transformed = await transformData(extracted);

  // Persist results
  const saved = await saveExtraction(fileId, transformed);

  return saved;
}
```

### Data Access Layer

```javascript
// app/upload/data/repository.js
import { getChromaClient } from '@/lib/db/chromadb';
import { getBlobClient } from '@/lib/storage/blob';

export async function saveUpload(data) {
  // Store file in blob storage
  const fileUrl = await getBlobClient().upload(data.file);

  // Store metadata in database
  const db = getChromaClient();
  const record = await db.collection('uploads').add({
    ...data,
    fileUrl,
    uploadedAt: new Date(),
  });

  return record;
}
```

### Shared Infrastructure

```javascript
// lib/db/chromadb.js
import { CloudClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from '@chroma-core/openai';

let instance;

export function getChromaClient() {
  if (!instance) {
    instance = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });
  }
  return instance;
}

export function getEmbeddingFunction() {
  return new OpenAIEmbeddingFunction({
    modelName: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  });
}
```

## Benefits

### 1. Scalability

- Components can be developed independently
- Easy to add new features without affecting others
- Can be deployed as separate services in the future

### 2. Maintainability

- Clear separation of concerns
- Easy to locate and fix bugs
- Reduced cognitive load

### 3. Testability

- Business logic isolated from frameworks
- Easy to mock dependencies
- Unit tests for each layer

### 4. Team Collaboration

- Different teams can work on different components
- Clear interfaces between components
- Reduced merge conflicts

### 5. Framework Independence

- Business logic not tied to Next.js
- Easy to migrate to different frameworks
- Reusable across different platforms

## Implementation Guidelines

### 1. Component Independence

- Each component should be self-contained
- Components communicate through well-defined interfaces
- No direct imports between components

### 2. Layer Responsibilities

**Entry Points Layer**:

- Handle external requests
- Validate input format
- Transform data for domain layer
- Return responses in appropriate format

**Domain Layer**:

- Contain all business logic
- Protocol agnostic
- Work with domain entities
- Orchestrate use cases

**Data Access Layer**:

- Handle all external data operations
- Provide abstraction over databases
- Return domain objects, not database records

### 3. Dependency Direction

- Dependencies flow inward: Entry Points → Domain → Data Access
- Domain layer should not depend on outer layers
- Use dependency injection to invert dependencies

### 4. Naming Conventions

- Use simple, descriptive names: `parser.js`, `evaluator.js`
- Group by feature/domain in folders
- Avoid complex suffixes and double extensions
- Follow Next.js conventions for special files

## Risk Mitigation

### Risks and Mitigation Strategies

1. **Risk**: Large refactoring disrupting development
   - **Mitigation**: Phased approach, maintain backward compatibility

2. **Risk**: Over-engineering for current scale
   - **Mitigation**: Start simple, add complexity as needed

3. **Risk**: Team learning curve
   - **Mitigation**: Documentation, code examples, pair programming

4. **Risk**: Performance overhead
   - **Mitigation**: Profile critical paths, optimize bottlenecks

## Success Metrics

- **Code Coverage**: >80% unit test coverage
- **Build Time**: <2 minutes for full build
- **Onboarding Time**: New developer productive in <1 week
- **Bug Resolution**: 50% faster bug fixes
- **Feature Velocity**: 30% increase in feature delivery

## Next Steps

1. Review and approve this architecture plan
2. Create detailed migration checklist
3. Set up new folder structure
4. Begin phased migration
5. Update documentation and tests

## References

- [Node.js Best Practices - Component Structure](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/breakintcomponents.md)
- [Node.js Best Practices - Layer Architecture](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/createlayers.md)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
