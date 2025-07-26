import { ModelConfig } from './types';

export class ModelRegistry {
  private models = new Map<string, ModelConfig>();
  private categories = new Map<string, ModelConfig[]>();
  private loaded = false;

  async loadFromCache(): Promise<void> {
    if (this.loaded) return;

    try {
      // Dynamic import to load the JSON file
      const cacheData = await import('../../data/models-cache.json');

      this.models.clear();
      this.categories.clear();

      for (const model of cacheData.models || []) {
        this.models.set(model.id, model);

        if (!this.categories.has(model.category)) {
          this.categories.set(model.category, []);
        }
        this.categories.get(model.category)!.push(model);
      }

      // Sort categories by quality score
      for (const [, categoryModels] of this.categories) {
        categoryModels.sort((a, b) => (b.metadata?.qualityScore || 0) - (a.metadata?.qualityScore || 0));
      }

      this.loaded = true;
      console.log(`📦 Loaded ${this.models.size} models from cache`);
    } catch (error) {
      console.error('Failed to load model cache:', error);
      this.loaded = true; // Prevent infinite retry
    }
  }

  async getModels(category?: string, limit?: number): Promise<ModelConfig[]> {
    await this.loadFromCache();

    if (category) {
      const categoryModels = this.categories.get(category) || [];
      return limit ? categoryModels.slice(0, limit) : categoryModels;
    }

    const allModels = Array.from(this.models.values())
      .sort((a, b) => (b.metadata?.qualityScore || 0) - (a.metadata?.qualityScore || 0));

    return limit ? allModels.slice(0, limit) : allModels;
  }

  async getModel(id: string): Promise<ModelConfig | null> {
    await this.loadFromCache();
    return this.models.get(id) || null;
  }

  async searchModels(query: string, filters?: { category?: string; provider?: string; minRunCount?: number }): Promise<ModelConfig[]> {
    await this.loadFromCache();

    const allModels = Array.from(this.models.values());

    return allModels.filter(model => {
      const matchesQuery = model.name.toLowerCase().includes(query.toLowerCase()) ||
                          model.metadata?.description?.toLowerCase().includes(query.toLowerCase());

      if (!matchesQuery) return false;

      if (filters?.category && model.category !== filters.category) return false;
      if (filters?.provider && model.provider !== filters.provider) return false;
      if (filters?.minRunCount && (model.metadata?.runCount || 0) < filters.minRunCount) return false;

      return true;
    }).sort((a, b) => (b.metadata?.qualityScore || 0) - (a.metadata?.qualityScore || 0));
  }

  getStats() {
    const stats = {
      totalModels: this.models.size,
      byCategory: {} as Record<string, number>,
      byProvider: {} as Record<string, number>
    };

    for (const model of this.models.values()) {
      stats.byCategory[model.category] = (stats.byCategory[model.category] || 0) + 1;
      stats.byProvider[model.provider] = (stats.byProvider[model.provider] || 0) + 1;
    }

    return stats;
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry();