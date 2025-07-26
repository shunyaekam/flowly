import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { getModelConfig, processModelParameters } from "@/lib/replicate-direct";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, modelId, customParams, modelData } = await request.json();

    console.log('Image generation request:', { prompt: prompt?.substring(0, 100) + '...', hasApiKey: !!apiKey, modelId });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Replicate API key is required' },
        { status: 400 }
      );
    }

    console.log('Initializing Replicate client...');
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Get model config directly from Replicate
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID required' },
        { status: 400 }
      );
    }

    let modelConfig;
    try {
      modelConfig = await getModelConfig(modelId, apiKey);
    } catch (error) {
      console.error('Failed to fetch model from Replicate:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Model not found' },
        { status: 404 }
      );
    }
    
    // Build proper endpoint with version
    const endpoint = `${modelConfig.endpoint}:${modelConfig.version}`;
    
    // Prepare base parameters
    const baseParams = {
      [modelConfig.inputMapping.prompt]: prompt
    };

    // Merge with custom parameters and process types
    const allParams = { ...baseParams, ...(customParams || {}) };
    
    // Process and validate parameters according to schema
    let input;
    try {
      input = processModelParameters(allParams, modelConfig);
      console.log('Processed parameters:', input);
    } catch (error) {
      console.error('Parameter processing error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Parameter validation failed' },
        { status: 400 }
      );
    }

    console.log(`Starting Replicate model run with ${endpoint}...`);
    const prediction = await replicate.predictions.create({
      version: endpoint,
      input,
    });

    console.log('Prediction started:', prediction.id);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Image generation error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error,
      requestBody: request.body // Log the request body
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during image generation' },
      { status: 500 }
    );
  }
} 