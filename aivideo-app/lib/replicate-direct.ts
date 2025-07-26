// Direct Replicate API helper functions
// Replaces the model registry with real-time API calls

export interface ReplicateModel {
  owner: string;
  name: string;
  description?: string;
  run_count?: number;
  cover_image_url?: string;
  default_example?: {
    input: Record<string, unknown>;
    output: string | string[];
  };
  latest_version?: {
    id: string;
    created_at: string;
    openapi_schema?: {
      components?: {
        schemas?: {
          Input?: {
            properties?: Record<string, unknown>;
          };
        };
      };
    };
  };
}

export interface SimpleModelConfig {
  endpoint: string;
  version: string;
  defaultParams: Record<string, unknown>;
  inputMapping: Record<string, string>;
  parameterTypes: Record<string, string>; // Maps parameter names to their expected types
  requiredParams: string[]; // List of required parameter names
}

/**
 * Search for a specific model by ID using Replicate API
 */
export async function searchReplicateModel(modelId: string, apiKey: string): Promise<ReplicateModel> {
  console.log(`Searching Replicate for model: ${modelId}`);
  
  const response = await fetch(`https://api.replicate.com/v1/models`, {
    method: 'QUERY',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'text/plain'
    },
    body: modelId
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const model = data.results?.find((m: ReplicateModel) => `${m.owner}/${m.name}` === modelId);

  if (!model) {
    throw new Error(`Model ${modelId} not found on Replicate`);
  }

  if (!model.latest_version?.id) {
    throw new Error(`Model ${modelId} missing version hash`);
  }

  console.log(`Found model ${modelId} with version ${model.latest_version.id}`);
  return model;
}

/**
 * Convert parameter value to the expected type based on schema
 */
function convertParameterType(value: unknown, expectedType: string): unknown {
  if (value === null || value === undefined || value === '') {
    return undefined; // Let required parameter validation handle this
  }

  switch (expectedType) {
    case 'number':
    case 'integer':
      const num = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : parseFloat(String(value)));
      return isNaN(num) ? undefined : num;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return !!value;
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map(s => s.trim());
        }
      }
      return [value];
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Create a simple model config from Replicate model data
 */
export function createModelConfig(model: ReplicateModel): SimpleModelConfig {
  // Extract schema information
  const schema = model.latest_version?.openapi_schema;
  const inputProps = schema?.components?.schemas?.Input?.properties || {};
  const requiredFields = (schema?.components?.schemas?.Input as Record<string, unknown>)?.required as string[] || [];
  
  const defaultParams: Record<string, unknown> = {};
  const parameterTypes: Record<string, string> = {};
  const requiredParams: string[] = [...requiredFields];
  
  // Find prompt field name and extract schema information
  let promptField = 'prompt';
  let videoField = 'video';
  
  // Debug logging to understand the schema structure
  console.log(`Schema for ${model.owner}/${model.name}:`, {
    properties: Object.keys(inputProps),
    required: requiredFields
  });
  
  // First pass: try to find exact matches for common field names
  const promptCandidates = Object.keys(inputProps).filter(key => 
    key.toLowerCase().includes('prompt') || 
    key === 'text' || 
    key === 'caption' ||
    key === 'input_text' ||
    key === 'query'
  );
  
  const videoCandidates = Object.keys(inputProps).filter(key =>
    key.toLowerCase().includes('video') || 
    key.toLowerCase().includes('image') || 
    key === 'input_image' || 
    key === 'start_image' ||
    key === 'img' ||
    key === 'input'
  );
  
  // Prefer more specific field names
  if (promptCandidates.length > 0) {
    // Prioritize 'prompt' over other candidates
    promptField = promptCandidates.find(c => c === 'prompt') || promptCandidates[0];
  }
  
  if (videoCandidates.length > 0) {
    // Prioritize common field names
    const priorityOrder = ['image', 'input_image', 'start_image', 'video', 'input'];
    videoField = priorityOrder.find(p => videoCandidates.includes(p)) || videoCandidates[0];
  }
  
  console.log(`Field mapping for ${model.owner}/${model.name}:`, {
    promptField,
    videoField,
    promptCandidates,
    videoCandidates
  });
  
  Object.entries(inputProps).forEach(([key, prop]: [string, unknown]) => {
    // Store parameter type information
    const propObj = prop as Record<string, unknown>;
    if (propObj.type) {
      parameterTypes[key] = String(propObj.type);
    } else if (propObj.anyOf || propObj.oneOf) {
      // Handle union types - pick the first one
      const unionTypes = (propObj.anyOf || propObj.oneOf) as Array<Record<string, unknown>>;
      parameterTypes[key] = String(unionTypes[0]?.type) || 'string';
    }
    
    // Store default values
    if (propObj.default !== undefined) {
      defaultParams[key] = propObj.default;
    }
  });

  return {
    endpoint: `${model.owner}/${model.name}`,
    version: model.latest_version!.id,
    defaultParams,
    inputMapping: { 
      prompt: promptField,
      videoUrl: videoField,
      imageUrl: videoField  // For video generation, this maps to the start image field
    },
    parameterTypes,
    requiredParams
  };
}

/**
 * Process and validate parameters according to the model schema
 */
export function processModelParameters(
  params: Record<string, unknown>, 
  modelConfig: SimpleModelConfig
): Record<string, unknown> {
  const processedParams: Record<string, unknown> = {};
  
  // Start with default parameters
  Object.assign(processedParams, modelConfig.defaultParams);
  
  console.log('Processing parameters:', {
    inputParams: params,
    defaultParams: modelConfig.defaultParams,
    inputMapping: modelConfig.inputMapping,
    requiredParams: modelConfig.requiredParams
  });
  
  // Process and convert custom parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      const expectedType = modelConfig.parameterTypes[key] || 'string';
      processedParams[key] = convertParameterType(value, expectedType);
    }
  });
  
  console.log('Processed parameters before validation:', processedParams);
  
  // Validate required parameters
  const missingRequired = modelConfig.requiredParams.filter(
    param => processedParams[param] === undefined || processedParams[param] === null || processedParams[param] === ''
  );
  
  if (missingRequired.length > 0) {
    console.error('Missing required parameters:', {
      missing: missingRequired,
      available: Object.keys(processedParams),
      inputMapping: modelConfig.inputMapping
    });
    throw new Error(`Missing required parameters: ${missingRequired.join(', ')}`);
  }
  
  return processedParams;
}

/**
 * Get model config directly from Replicate (combines search + config creation)
 */
export async function getModelConfig(modelId: string, apiKey: string): Promise<SimpleModelConfig> {
  const model = await searchReplicateModel(modelId, apiKey);
  return createModelConfig(model);
}