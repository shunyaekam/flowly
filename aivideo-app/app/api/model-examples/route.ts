import { NextRequest, NextResponse } from "next/server";
import { searchReplicateModel } from "@/lib/replicate-direct";

export async function POST(request: NextRequest) {
  try {
    const { modelId, apiKey } = await request.json();

    if (!modelId || !apiKey) {
      return NextResponse.json(
        { error: 'Model ID and API key are required' },
        { status: 400 }
      );
    }

    // Fetch model data using our direct Replicate helper
    const model = await searchReplicateModel(modelId, apiKey);
    const examples: string[] = [];
    
    // Get examples from default_example.input - simple and direct
    if (model.default_example?.input) {
      const input = model.default_example.input;
      
      // Look for common prompt fields
      const promptFields = ['prompt', 'text', 'description', 'caption', 'query', 'input_text'];
      
      for (const field of promptFields) {
        const fieldValue = input[field];
        if (fieldValue && typeof fieldValue === 'string' && fieldValue.length > 10) {
          examples.push(fieldValue);
          break; // Take the first valid prompt we find
        }
      }
    }

    // Also check schema for example prompts
    if (model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties) {
      const props = model.latest_version.openapi_schema.components.schemas.Input.properties;
      
      // Look for prompt field with examples
      const promptFields = ['prompt', 'text', 'description', 'caption'];
      
      for (const field of promptFields) {
        const prop = props[field] as Record<string, unknown> | undefined;
        if (prop?.example && typeof prop.example === 'string' && prop.example.length > 10) {
          examples.push(prop.example);
          break;
        }
        if (prop?.examples && Array.isArray(prop.examples) && prop.examples.length > 0) {
          const firstExample = prop.examples[0];
          if (typeof firstExample === 'string' && firstExample.length > 10) {
            examples.push(firstExample);
            break;
          }
        }
      }
    }
    
    // Remove duplicates and return up to 3 examples (fewer is better)
    const uniqueExamples = [...new Set(examples)].slice(0, 3);
    
    return NextResponse.json(uniqueExamples);
  } catch (error) {
    console.error('Model examples fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch model examples' },
      { status: 500 }
    );
  }
}