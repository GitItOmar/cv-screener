# Vector Store Service

A comprehensive vector store service built on ChromaDB with OpenAI embeddings for semantic search and document storage operations.

## Features

- **ChromaDB Integration**: Cloud-based vector database operations
- **OpenAI Embeddings**: Automatic text embedding generation
- **Collection Management**: Dynamic collection creation and management
- **Semantic Search**: Configurable similarity search with thresholds
- **Document Operations**: CRUD operations for vector documents
- **Metadata Support**: Rich metadata storage and filtering

## Installation

This package is part of the screening application and should be imported directly:

```javascript
import VectorStoreService from '@/lib/vector-store/src/index.js';
```

## Usage

### Basic Setup

```javascript
const vectorStore = new VectorStoreService();

// Initialize the service
await vectorStore.initialize();

// Create a collection
const collection = await vectorStore.createCollection('resumes', {
  description: 'Resume data collection',
  metadata: { version: '1.0' },
});
```

### Adding Documents

```javascript
await vectorStore.addDocuments('resumes', {
  ids: ['resume-1', 'resume-2'],
  documents: ['Resume text 1', 'Resume text 2'],
  metadatas: [
    { name: 'John Doe', role: 'Developer' },
    { name: 'Jane Smith', role: 'Designer' },
  ],
});
```

### Semantic Search

```javascript
const results = await vectorStore.searchSimilar('resumes', {
  queryTexts: 'experienced JavaScript developer',
  nResults: 5,
  threshold: 0.7,
  where: { role: 'Developer' },
});
```

## Configuration

The service requires the following environment variables:

- `CHROMA_API_KEY` - ChromaDB API key
- `CHROMA_TENANT` - ChromaDB tenant ID
- `CHROMA_DATABASE` - ChromaDB database name
- `OPENAI_API_KEY` - OpenAI API key for embeddings

## API Reference

### Core Methods

- `initialize()` - Initialize the service
- `createCollection(name, config)` - Create or get a collection
- `addDocuments(collectionName, documents)` - Add documents to collection
- `searchSimilar(collectionName, searchParams)` - Semantic search
- `updateDocuments(collectionName, updates)` - Update existing documents
- `deleteDocuments(collectionName, ids)` - Delete documents
- `getDocuments(collectionName, params)` - Retrieve documents

### Utility Methods

- `getCollectionStats(collectionName)` - Get collection statistics
- `generateEmbeddings(texts)` - Generate embeddings for text
- `listCollections()` - List all collections
- `deleteCollection(collectionName)` - Delete a collection
- `close()` - Close connections and cleanup

## Error Handling

The service throws descriptive errors for common issues:

- Service not initialized
- Collection not found
- Invalid parameters
- ChromaDB connection errors
- OpenAI API errors

## Dependencies

- `chromadb` - ChromaDB client library
- `@chroma-core/openai` - OpenAI embedding function
