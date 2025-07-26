import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { modelRegistry } from "@/lib/model-registry/registry";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, modelId, customParams } = await request.json();

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

    // Get model config from registry if modelId is provided, otherwise fallback to default
    let modelConfig = null;
    if (modelId) {
      modelConfig = await modelRegistry.getModel(modelId);
      if (!modelConfig) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }
    }

    console.log('Initializing Replicate client...');
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Use model config if available, otherwise use default Seedream-3
    const endpoint = modelConfig ? modelConfig.endpoint : "bytedance/seedream-3";
    let input = modelConfig ? {
      ...modelConfig.defaultParams,
      [modelConfig.inputMapping.prompt || 'prompt']: prompt
    } : {
      prompt: prompt,
      aspect_ratio: "9:16"
    };

    // Apply custom parameters if provided
    if (customParams && typeof customParams === 'object') {
      console.log('Applying custom parameters:', customParams);
      input = { ...input, ...customParams };
      // Ensure prompt is still set correctly
      if (modelConfig) {
        input[modelConfig.inputMapping.prompt || 'prompt'] = prompt;
      } else {
        input.prompt = prompt;
      }
    }

    console.log(`Starting Replicate model run with ${endpoint}...`);
    const prediction = await replicate.predictions.create({
      model: endpoint,
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