// Replicate API Types
export interface ReplicateModel {
  owner: string;
  name: string;
  description?: string;
  run_count?: number;
  cover_image_url?: string;
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  default_example?: {
    input: Record<string, any>;
    output: string;
  };
  latest_version?: {
    id: string;
    created_at: string;
    openapi_schema?: {
      components?: {
        schemas?: {
          Input?: {
            properties?: Record<string, ReplicateSchemaProperty>;
          };
          Output?: {
            type?: string;
            format?: string;
          };
        };
      };
    };
  };
}

export interface ReplicateSchemaProperty {
  type?: string;
  format?: string;
  default?: string | number | boolean;
  description?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  provider: 'replicate' | 'fal' | 'together' | 'huggingface';
  category: 'image' | 'video' | 'audio';
  endpoint: string;
  version?: string;

  // Smart parameter extraction
  defaultParams: Record<string, string | number | boolean>;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;

  // Rich metadata for UI
  metadata: {
    description: string;
    runCount: number;
    confidence: number;
    qualityScore: number;
    createdAt?: string;
    owner: string;
    coverImage?: string;
    githubUrl?: string;
    paperUrl?: string;
    licenseUrl?: string;
    pricing?: {
      tier: 'free' | 'cheap' | 'premium';
      costPer1000?: number;
    };
    // Store example prompts and outputs
    examples?: {
      input: Record<string, any>;
      output: string;
      prompt?: string;
    }[];
    // Store parameter descriptions
    parameterDescriptions?: Record<string, string>;
  };
}

export interface SyncOptions {
  category?: 'image' | 'video' | 'audio';
  limit?: number;
  forceRefresh?: boolean;
  minRunCount?: number;
}

export interface ProviderSyncResult {
  provider: string;
  modelsFetched: number;
  modelsFiltered: number;
  timeSeconds: number;
  errors?: string[];
}