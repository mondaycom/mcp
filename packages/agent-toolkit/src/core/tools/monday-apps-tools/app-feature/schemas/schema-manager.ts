import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';

export interface AppFeatureSchemaDefinition {
  id: number;
  name: string;
  version: number;
  status: string;
  dataSchema: Record<string, any>;
  uiSchema: Record<string, any>;
  settings: Record<string, any>;
  previousVersionId?: number;
  userId?: number;
  accountId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppFeatureSchemasResponse {
  schemas: AppFeatureSchemaDefinition[];
  lastFetchedAt: Date;
  fetchError?: string;
}

/**
 * Singleton class to manage app feature schemas
 * Fetches schemas once from the public endpoint and caches them in memory
 */
export class AppFeatureSchemaManager {
  private static instance: AppFeatureSchemaManager;
  private schemas: Map<string, AppFeatureSchemaDefinition> = new Map();
  private lastFetchedAt?: Date;
  private fetchPromise?: Promise<void>;
  private fetchError?: string;
  private readonly SCHEMA_ENDPOINT = 'https://monday-apps-ms.monday.com/apps_ms/public/platform-building-blocks-schemas';

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AppFeatureSchemaManager {
    if (!AppFeatureSchemaManager.instance) {
      AppFeatureSchemaManager.instance = new AppFeatureSchemaManager();
    }
    return AppFeatureSchemaManager.instance;
  }

  /**
   * Initialize and fetch schemas from the endpoint
   * This method ensures schemas are only fetched once, even if called multiple times
   */
  public async initialize(): Promise<void> {
    // If we're already fetching, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // If already initialized, return immediately
    if (this.schemas.size > 0 && this.lastFetchedAt) {
      return Promise.resolve();
    }

    // Create a new fetch promise
    this.fetchPromise = this.fetchSchemas();
    
    try {
      await this.fetchPromise;
    } finally {
      // Clear the promise after completion (success or failure)
      this.fetchPromise = undefined;
    }
  }

  /**
   * Internal method to fetch schemas from the endpoint
   */
  private async fetchSchemas(): Promise<void> {
    try {
      // Create a custom HTTPS agent to handle self-signed certificates
      // Uses the same mechanism as base-monday-apps-tool.ts
      const httpsAgent = new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        rejectUnauthorized: false,
      });

      const response = await axios.get<AppFeatureSchemaDefinition[]>(this.SCHEMA_ENDPOINT, {
        timeout: 10000, // 10 second timeout (increased from 3)
        headers: {
          'Accept': 'application/json',
        },
        httpsAgent,
      });

      // Clear existing schemas and errors
      this.schemas.clear();
      this.fetchError = undefined;

      // Parse and store schemas
      const schemasArray = Array.isArray(response.data) ? response.data : [];
      
      for (const schema of schemasArray) {
        if (schema.name && schema.status === 'ACTIVE') {
          this.schemas.set(schema.name, schema);
        }
      }

      this.lastFetchedAt = new Date();
    
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.fetchError = errorMessage;
      console.error(`Failed to fetch app feature schemas: ${errorMessage}`);
      
      // Don't throw - allow the system to continue without schemas
      // Tools can still work, just without schema validation/hints
    }
  }

  /**
   * Get schema for a specific feature type
   */
  public getSchema(featureType: string): AppFeatureSchemaDefinition | undefined {
    return this.schemas.get(featureType);
  }

  /**
   * Get all available schemas
   */
  public getAllSchemas(): AppFeatureSchemasResponse {
    return {
      schemas: Array.from(this.schemas.values()),
      lastFetchedAt: this.lastFetchedAt || new Date(),
      fetchError: this.fetchError,
    };
  }

  /**
   * Get the last fetch error, if any
   */
  public getFetchError(): string | undefined {
    return this.fetchError;
  }

  /**
   * Get list of all available feature types
   */
  public getAvailableFeatureTypes(): string[] {
    return Array.from(this.schemas.keys()).sort();
  }

  /**
   * Check if schemas have been initialized
   */
  public isInitialized(): boolean {
    return this.schemas.size > 0 && this.lastFetchedAt !== undefined;
  }

  /**
   * Get the data schema for a specific feature type
   * This is what the MCP client would use to understand the structure of the "data" field
   */
  public getDataSchema(featureType: string): Record<string, any> | undefined {
    const schema = this.schemas.get(featureType);
    return schema?.dataSchema;
  }

  /**
   * Force refresh schemas from the endpoint
   * Useful for testing or if schemas need to be updated
   */
  public async refresh(): Promise<void> {
    this.schemas.clear();
    this.lastFetchedAt = undefined;
    this.fetchPromise = undefined;
    this.fetchError = undefined;
    await this.initialize();
  }

  /**
   * Get human-readable information about a feature type
   */
  public getFeatureInfo(featureType: string): {
    name: string;
    version: number;
    hasDataSchema: boolean;
    dataSchemaProperties?: string[];
    description?: string;
  } | undefined {
    const schema = this.schemas.get(featureType);
    
    if (!schema) {
      return undefined;
    }

    const dataSchemaProperties = schema.dataSchema?.properties 
      ? Object.keys(schema.dataSchema.properties)
      : undefined;

    return {
      name: schema.name,
      version: schema.version,
      hasDataSchema: !!schema.dataSchema,
      dataSchemaProperties,
      description: schema.settings?.marketplaceConfig?.description || schema.settings?.marketplaceConfig?.name,
    };
  }
}

/**
 * Export a singleton instance for convenience
 */
export const schemaManager = AppFeatureSchemaManager.getInstance();

