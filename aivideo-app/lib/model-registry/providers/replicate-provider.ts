import { ModelConfig, SyncOptions, ProviderSyncResult, ReplicateModel } from '../types';
import { SmartModelCategorizer } from '../smart-categorizer';
import { ModelQualityFilter } from '../quality-filter';

export class ReplicateProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async syncModels(options: SyncOptions = {}): Promise<{ result: ProviderSyncResult; models: ModelConfig[] }> {
    const startTime = Date.now();
    let modelsFetched = 0;
    let modelsFiltered = 0;
    const errors: string[] = [];

    try {
      console.log('🔄 Syncing Replicate models...');

      const allModels = await this.fetchAllModels(options);
      modelsFetched = allModels.length;

      const qualityModels = ModelQualityFilter.filterHighQuality(allModels);
      const categorizedModels = this.categorizeAndFilter(qualityModels, options);
      modelsFiltered = categorizedModels.length;

      console.log(`✅ Replicate: ${modelsFiltered}/${modelsFetched} models processed`);

      return {
        result: {
          provider: 'replicate',
          modelsFetched,
          modelsFiltered,
          timeSeconds: (Date.now() - startTime) / 1000,
          errors: errors.length > 0 ? errors : undefined
        },
        models: categorizedModels
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        result: {
          provider: 'replicate',
          modelsFetched,
          modelsFiltered,
          timeSeconds: (Date.now() - startTime) / 1000,
          errors
        },
        models: []
      };
    }
  }

  private async fetchAllModels(options: SyncOptions): Promise<ReplicateModel[]> {
    const models: ReplicateModel[] = [];
    let cursor: string | null = null;
    let fetched = 0;

    const headers = {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    do {
      const url = `https://api.replicate.com/v1/models?${cursor ? `cursor=${cursor}&` : ''}limit=25`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      models.push(...data.results);

      cursor = data.next?.split('cursor=')[1] || null;
      fetched += data.results.length;

      // Smart early termination
      if (options.limit && fetched >= options.limit) break;
      if (options.category && models.filter(m => this.matchesCategory(m, options.category!)).length >= (options.limit || 50)) break;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } while (cursor);

    return models;
  }

  private categorizeAndFilter(models: ReplicateModel[], options: SyncOptions): ModelConfig[] {
    const configs: ModelConfig[] = [];

    for (const model of models) {
      const categoryResult = SmartModelCategorizer.categorizeModel(model);

      if (!categoryResult || categoryResult.confidence < 0.4) continue;
      if (options.category && categoryResult.category !== options.category) continue;
      if (options.minRunCount && (model.run_count || 0) < options.minRunCount) continue;

      configs.push({
        id: `${model.owner}/${model.name}`,
        name: model.name,
        displayName: this.createDisplayName(model),
        provider: 'replicate',
        category: categoryResult.category,
        endpoint: `${model.owner}/${model.name}`,
        version: model.latest_version?.id,

        defaultParams: this.extractSmartDefaults(model),
        inputMapping: this.createInputMapping(model),
        outputMapping: { result: 'output' },

        metadata: {
          description: model.description || '',
          runCount: model.run_count || 0,
          confidence: categoryResult.confidence,
          qualityScore: ModelQualityFilter.calculateQualityScore(model),
          createdAt: model.latest_version?.created_at,
          owner: model.owner,
          coverImage: model.cover_image_url,
          githubUrl: model.github_url,
          paperUrl: model.paper_url,
          licenseUrl: model.license_url,
          pricing: this.estimatePricing(model),
          examples: this.extractExamples(model),
          parameterDescriptions: this.extractParameterDescriptions(model)
        }
      });
    }

    return configs.sort((a, b) => (b.metadata.qualityScore || 0) - (a.metadata.qualityScore || 0));
  }

  private matchesCategory(model: ReplicateModel, category: string): boolean {
    const result = SmartModelCategorizer.categorizeModel(model);
    return result?.category === category;
  }

  private createDisplayName(model: ReplicateModel): string {
    return model.name.split('/').pop() || model.name;
  }

  private extractSmartDefaults(model: ReplicateModel): Record<string, string | number | boolean> {
    const schema = model.latest_version?.openapi_schema;
    const inputProps = schema?.components?.schemas?.Input?.properties || {};
    const defaults: Record<string, string | number | boolean> = {};

    // Extract default values from schema
    Object.entries(inputProps).forEach(([key, prop]) => {
      if (prop.default !== undefined) {
        defaults[key] = prop.default;
      }
    });

    // Add common defaults for your use case
    if (inputProps.aspect_ratio) defaults.aspect_ratio = '9:16';
    if (inputProps.guidance_scale) defaults.guidance_scale = 7.5;

    return defaults;
  }

  private createInputMapping(model: ReplicateModel): Record<string, string> {
    const schema = model.latest_version?.openapi_schema;
    const inputProps = schema?.components?.schemas?.Input?.properties || {};
    const mapping: Record<string, string> = {};

    // Create standard mappings
    if (inputProps.prompt) mapping.prompt = 'prompt';
    if (inputProps.image) mapping.imageUrl = 'image';
    if (inputProps.start_image) mapping.imageUrl = 'start_image';
    if (inputProps.video) mapping.videoUrl = 'video';

    return mapping;
  }

  private estimatePricing(model: ReplicateModel): { tier: 'free' | 'cheap' | 'premium' } {
    const runCount = model.run_count || 0;
    const owner = model.owner;

    if (['stability-ai', 'openai', 'meta'].includes(owner)) {
      return { tier: 'premium' };
    } else if (runCount > 10000) {
      return { tier: 'cheap' };
    } else {
      return { tier: 'free' };
    }
  }

  private extractExamples(model: ReplicateModel): { input: Record<string, any>; output: string; prompt?: string; }[] | undefined {
    const examples = [];
    
    // Extract default example
    if (model.default_example && model.default_example.input && model.default_example.output) {
      examples.push({
        input: model.default_example.input,
        output: model.default_example.output,
        prompt: model.default_example.input.prompt
      });
    }
    
    return examples.length > 0 ? examples : undefined;
  }

  private extractParameterDescriptions(model: ReplicateModel): Record<string, string> | undefined {
    const descriptions: Record<string, string> = {};
    const schema = model.latest_version?.openapi_schema;
    const inputProps = schema?.components?.schemas?.Input?.properties || {};
    
    // Extract parameter descriptions from OpenAPI schema
    Object.entries(inputProps).forEach(([key, prop]: [string, any]) => {
      if (prop.description) {
        descriptions[key] = prop.description;
      }
    });
    
    return Object.keys(descriptions).length > 0 ? descriptions : undefined;
  }
}