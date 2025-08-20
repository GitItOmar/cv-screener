import { CloudClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from '@chroma-core/openai';

/**
 * Generic Vector Store Service
 *
 * A flexible ChromaDB client wrapper that handles:
 * - Dynamic collection management
 * - Embedding generation using OpenAI
 * - Generic document storage and retrieval operations
 * - Semantic search with configurable parameters
 */
class GenericVectorStoreService {
  constructor() {
    this.client = null;
    this.embeddingFunction = null;
    this.collections = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the vector store service
   */
  async initialize() {
    try {
      // Initialize ChromaDB cloud client
      this.client = new CloudClient({
        apiKey: process.env.CHROMA_API_KEY,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE,
      });

      // Create OpenAI embedding function
      this.embeddingFunction = new OpenAIEmbeddingFunction({
        modelName: 'text-embedding-3-small',
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Verify connection
      await this.client.version();

      this.initialized = true;
      console.log('✅ Generic Vector Store Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Generic Vector Store Service:', error.message);
      throw error;
    }
  }

  /**
   * Create or get a collection with specified configuration
   *
   * @param {string} name - Collection name
   * @param {Object} config - Collection configuration
   * @param {string} config.description - Collection description
   * @param {Object} config.metadata - Additional metadata
   * @param {Function} config.embeddingFunction - Custom embedding function (optional)
   * @returns {Object} Collection instance
   */
  async createCollection(name, config = {}) {
    this._checkInitialized();

    try {
      const {
        description = 'Generic vector collection',
        metadata = {},
        embeddingFunction = this.embeddingFunction,
      } = config;

      // Try to get existing collection first
      let collection;
      try {
        collection = await this.client.getCollection({
          name,
          embeddingFunction,
        });
        console.log(`✅ Found existing collection: ${name}`);
      } catch {
        // Collection doesn't exist, create it
        console.log(`📝 Creating new collection: ${name}`);
        collection = await this.client.createCollection({
          name,
          metadata: {
            description,
            version: '1.0',
            createdAt: new Date().toISOString(),
            ...metadata,
          },
          embeddingFunction,
        });
      }

      // Store collection reference
      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`❌ Failed to create collection ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Add documents to a collection
   *
   * @param {string} collectionName - Name of the collection
   * @param {Object} documents - Documents to add
   * @param {string[]} documents.ids - Document IDs
   * @param {string[]} documents.documents - Document texts
   * @param {Object[]} documents.metadatas - Document metadata
   * @param {number[][]} documents.embeddings - Pre-computed embeddings (optional)
   * @returns {string[]} Array of added document IDs
   */
  async addDocuments(collectionName, { ids, documents, metadatas = [], embeddings = null }) {
    this._checkInitialized();

    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(
          `Collection ${collectionName} not found. Create it first using createCollection()`,
        );
      }

      // Ensure metadatas array matches documents length
      while (metadatas.length < documents.length) {
        metadatas.push({});
      }

      // Add timestamp to all metadata
      const timestampedMetadatas = metadatas.map((metadata) => ({
        ...metadata,
        addedAt: new Date().toISOString(),
      }));

      const addOptions = {
        ids,
        documents,
        metadatas: timestampedMetadatas,
      };

      if (embeddings) {
        addOptions.embeddings = embeddings;
      }

      await collection.add(addOptions);

      console.log(`✅ Added ${documents.length} documents to ${collectionName}`);
      return ids;
    } catch (error) {
      console.error(`❌ Failed to add documents to ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for similar documents in a collection
   *
   * @param {string} collectionName - Name of the collection
   * @param {Object} searchParams - Search parameters
   * @param {string|string[]} searchParams.queryTexts - Query text(s)
   * @param {number} searchParams.nResults - Number of results to return
   * @param {number} searchParams.threshold - Similarity threshold (0-1)
   * @param {Object} searchParams.where - Metadata filters
   * @param {string[]} searchParams.include - Fields to include in response
   * @returns {Object} Search results
   */
  async searchSimilar(
    collectionName,
    {
      queryTexts,
      nResults = 5,
      threshold = 0.3,
      where = null,
      include = ['documents', 'metadatas', 'distances'],
    },
  ) {
    this._checkInitialized();

    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(
          `Collection ${collectionName} not found. Create it first using createCollection()`,
        );
      }

      const queryOptions = {
        queryTexts: Array.isArray(queryTexts) ? queryTexts : [queryTexts],
        nResults,
        include,
      };

      if (where) {
        queryOptions.where = where;
      }

      const results = await collection.query(queryOptions);

      // Filter by similarity threshold if distances are available
      if (results.distances && results.distances[0] && threshold < 1.0) {
        const filteredResults = this._filterByThreshold(results, threshold);
        return filteredResults;
      }

      return results;
    } catch (error) {
      console.error(`❌ Failed to search ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update documents in a collection
   *
   * @param {string} collectionName - Name of the collection
   * @param {Object} updates - Updates to apply
   * @param {string[]} updates.ids - Document IDs to update
   * @param {string[]} updates.documents - New document texts (optional)
   * @param {Object[]} updates.metadatas - New metadata (optional)
   * @param {number[][]} updates.embeddings - New embeddings (optional)
   */
  async updateDocuments(
    collectionName,
    { ids, documents = null, metadatas = null, embeddings = null },
  ) {
    this._checkInitialized();

    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      const updateOptions = { ids };

      if (documents) updateOptions.documents = documents;
      if (metadatas) {
        // Add timestamp to metadata
        updateOptions.metadatas = metadatas.map((metadata) => ({
          ...metadata,
          updatedAt: new Date().toISOString(),
        }));
      }
      if (embeddings) updateOptions.embeddings = embeddings;

      await collection.update(updateOptions);

      console.log(`✅ Updated ${ids.length} documents in ${collectionName}`);
    } catch (error) {
      console.error(`❌ Failed to update documents in ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete documents from a collection
   *
   * @param {string} collectionName - Name of the collection
   * @param {string[]} ids - Document IDs to delete
   */
  async deleteDocuments(collectionName, ids) {
    this._checkInitialized();

    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      await collection.delete({ ids });

      console.log(`✅ Deleted ${ids.length} documents from ${collectionName}`);
    } catch (error) {
      console.error(`❌ Failed to delete documents from ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get documents from a collection
   *
   * @param {string} collectionName - Name of the collection
   * @param {Object} getParams - Get parameters
   * @param {string[]} getParams.ids - Specific document IDs (optional)
   * @param {Object} getParams.where - Metadata filters (optional)
   * @param {number} getParams.limit - Maximum number of documents (optional)
   * @param {number} getParams.offset - Offset for pagination (optional)
   * @param {string[]} getParams.include - Fields to include
   * @returns {Object} Retrieved documents
   */
  async getDocuments(
    collectionName,
    {
      ids = null,
      where = null,
      limit = null,
      offset = null,
      include = ['documents', 'metadatas'],
    } = {},
  ) {
    this._checkInitialized();

    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      const getOptions = { include };

      if (ids) getOptions.ids = ids;
      if (where) getOptions.where = where;
      if (limit) getOptions.limit = limit;
      if (offset) getOptions.offset = offset;

      const results = await collection.get(getOptions);
      return results;
    } catch (error) {
      console.error(`❌ Failed to get documents from ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get collection statistics
   *
   * @param {string} collectionName - Name of the collection (optional)
   * @returns {Object} Collection statistics
   */
  async getCollectionStats(collectionName = null) {
    this._checkInitialized();

    try {
      if (collectionName) {
        // Get stats for specific collection
        const collection = this.collections.get(collectionName);
        if (!collection) {
          throw new Error(`Collection ${collectionName} not found`);
        }

        const count = await collection.count();
        return {
          name: collectionName,
          documentCount: count,
          metadata: collection.metadata,
        };
      } else {
        // Get stats for all collections
        const stats = {};

        for (const [name, collection] of this.collections.entries()) {
          const count = await collection.count();
          stats[name] = {
            documentCount: count,
            name: collection.name,
          };
        }

        return stats;
      }
    } catch (error) {
      console.error('❌ Failed to get collection stats:', error.message);
      throw error;
    }
  }

  /**
   * Delete a collection
   *
   * @param {string} collectionName - Name of the collection to delete
   */
  async deleteCollection(collectionName) {
    this._checkInitialized();

    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      console.log(`✅ Collection deleted: ${collectionName}`);
    } catch (error) {
      console.error(`❌ Failed to delete collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * List all collections
   *
   * @returns {string[]} Array of collection names
   */
  async listCollections() {
    this._checkInitialized();

    try {
      const collections = await this.client.listCollections();
      return collections.map((col) => col.name);
    } catch (error) {
      console.error('❌ Failed to list collections:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using the configured embedding function
   *
   * @param {string|string[]} texts - Text(s) to embed
   * @returns {number[]|number[][]} Embeddings
   */
  async generateEmbeddings(texts) {
    this._checkInitialized();

    try {
      if (!this.embeddingFunction) {
        throw new Error('No embedding function configured');
      }

      const inputTexts = Array.isArray(texts) ? texts : [texts];
      const embeddings = await this.embeddingFunction.generate(inputTexts);

      return Array.isArray(texts) ? embeddings : embeddings[0];
    } catch (error) {
      console.error('❌ Failed to generate embeddings:', error.message);
      throw error;
    }
  }

  /**
   * Filter search results by similarity threshold
   *
   * @private
   */
  _filterByThreshold(results, threshold) {
    const filteredResults = {
      ids: [[]],
      documents: [[]],
      metadatas: [[]],
      distances: [[]],
    };

    if (results.distances && results.distances[0]) {
      results.distances[0].forEach((distance, index) => {
        // ChromaDB uses cosine distance (lower is better, convert to similarity)
        const similarity = 1 - distance;
        if (similarity >= threshold) {
          filteredResults.ids[0].push(results.ids[0][index]);
          if (results.documents) filteredResults.documents[0].push(results.documents[0][index]);
          if (results.metadatas) filteredResults.metadatas[0].push(results.metadatas[0][index]);
          filteredResults.distances[0].push(distance);
        }
      });
    }

    return filteredResults;
  }

  /**
   * Check if service is initialized
   *
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('Vector Store Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Close connections and cleanup
   */
  async close() {
    // ChromaDB doesn't require explicit connection closing
    this.initialized = false;
    this.client = null;
    this.embeddingFunction = null;
    this.collections.clear();
    console.log('✅ Generic Vector Store Service closed');
  }
}

// Export singleton instance
const genericVectorStore = new GenericVectorStoreService();
export default genericVectorStore;
