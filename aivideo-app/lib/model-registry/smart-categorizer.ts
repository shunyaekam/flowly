import { ReplicateModel } from './types';

interface CategoryResult {
  category: 'image' | 'video' | 'audio';
  confidence: number;
}

export class SmartModelCategorizer {
  static categorizeModel(model: ReplicateModel): CategoryResult | null {
    const schema = model.latest_version?.openapi_schema;
    if (!schema) return null;

    const inputProps = schema.components?.schemas?.Input?.properties || {};
    const outputSchema = schema.components?.schemas?.Output || {};
    const description = model.description?.toLowerCase() || '';
    const name = model.name.toLowerCase();
    const defaultExample = model.default_example;

    // Must have prompt input
    if (!inputProps.prompt) {
      return null;
    }

    // Must have valid output format
    const hasValidOutput = (outputSchema.type === 'string' && outputSchema.format === 'uri') ||
                          outputSchema.type === 'array';
    
    if (!hasValidOutput) {
      return null;
    }

    // Check actual example output if available to determine type
    let exampleOutputType = null;
    if (defaultExample?.output) {
      const outputUrl = defaultExample.output.toLowerCase();
      if (outputUrl.includes('.mp4') || outputUrl.includes('.mov') || outputUrl.includes('.webm')) {
        exampleOutputType = 'video';
      } else if (outputUrl.includes('.mp3') || outputUrl.includes('.wav') || outputUrl.includes('.m4a')) {
        exampleOutputType = 'audio';
      } else if (outputUrl.includes('.jpg') || outputUrl.includes('.png') || outputUrl.includes('.webp') || outputUrl.includes('.gif')) {
        exampleOutputType = 'image';
      }
    }

    // If we can determine from example output, use that
    if (exampleOutputType) {
      return {
        category: exampleOutputType as 'image' | 'video' | 'audio',
        confidence: 0.9
      };
    }

    // Otherwise, use simple keyword-based categorization
    // Audio: Explicit audio keywords
    if (/\b(audio|music|sound|speech|voice|tts|text-to-speech|musicgen|audioldm|bark)\b/.test(description) ||
        /\b(audio|music|sound|speech|voice|tts)\b/.test(name)) {
      return {
        category: 'audio',
        confidence: 0.8
      };
    }

    // Video: Video keywords OR has video/image inputs (typical for video generation)
    if (/\b(video|animate|motion|clip|movie|footage|generate.*video)\b/.test(description) ||
        /\b(video|animate|motion)\b/.test(name) ||
        (inputProps.start_image || inputProps.end_image || inputProps.video)) {
      return {
        category: 'video',
        confidence: 0.7
      };
    }

    // Image: Everything else (most common case)
    return {
      category: 'image',
      confidence: 0.6
    };
  }

  private static calculateConfidence(description: string, name: string, keywords: string[]): number {
    let confidence = 0.5;

    keywords.forEach(keyword => {
      if (description.includes(keyword)) confidence += 0.15;
      if (name.includes(keyword)) confidence += 0.1;
    });

    if (description === 'undefined' || description === '') confidence -= 0.3;

    return Math.min(1.0, Math.max(0.1, confidence));
  }
}