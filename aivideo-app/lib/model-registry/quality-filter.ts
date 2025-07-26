import { ReplicateModel } from './types';

export class ModelQualityFilter {
  static filterHighQuality(models: ReplicateModel[]): ReplicateModel[] {
    return models
      .filter(this.hasValidSchema)
      .filter(this.hasDescription)
      .filter(this.hasReasonableRunCount)
      .sort(this.sortByQualityScore);
  }

  private static hasValidSchema(model: ReplicateModel): boolean {
    return !!model.latest_version?.openapi_schema?.components?.schemas?.Input;
  }

  private static hasDescription(model: ReplicateModel): boolean {
    return !!model.description &&
           model.description !== 'undefined' &&
           model.description.length > 10;
  }

  private static hasReasonableRunCount(model: ReplicateModel): boolean {
    return (model.run_count || 0) >= 10; // Reduced from 100 to 10
  }

  private static sortByQualityScore(a: ReplicateModel, b: ReplicateModel): number {
    const scoreA = ModelQualityFilter.calculateQualityScore(a);
    const scoreB = ModelQualityFilter.calculateQualityScore(b);
    return scoreB - scoreA;
  }

  static calculateQualityScore(model: ReplicateModel): number {
    let score = 0;

    // Run count (normalized)
    score += Math.log10((model.run_count || 1) + 1) * 10;

    // Description quality
    if (model.description && model.description.length > 50) score += 20;

    // Recency
    const daysSinceCreation = (Date.now() - new Date(model.latest_version?.created_at || 0).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) score += 10;
    else if (daysSinceCreation < 90) score += 5;

    // Official models
    if (['luma', 'stability-ai', 'openai', 'meta', 'bytedance'].includes(model.owner)) score += 15;

    return score;
  }
}