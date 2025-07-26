import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { modelRegistry } from "@/lib/model-registry/registry";

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl, apiKey, modelId, customParams } = await request.json();

    console.log('Video generation request:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      imageUrl: imageUrl?.substring(0, 100) + '...',
      hasApiKey: !!apiKey,
      modelId
    });

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: 'Prompt and imageUrl are required' },
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

    const replicate = new Replicate({
      auth: apiKey,
    });

    // Use model config if available, otherwise use default Kling v2.1
    const endpoint = modelConfig ? modelConfig.endpoint : "kwaivgi/kling-v2.1";
    let input = modelConfig ? {
      ...modelConfig.defaultParams,
      [modelConfig.inputMapping.prompt || 'prompt']: prompt,
      [modelConfig.inputMapping.imageUrl || 'start_image']: imageUrl
    } : {
      prompt: prompt,
      start_image: imageUrl,
      mode: "pro"
    };

    // Apply custom parameters if provided
    if (customParams && typeof customParams === 'object') {
      console.log('Applying custom parameters:', customParams);
      input = { ...input, ...customParams };
      // Ensure prompt and imageUrl are still set correctly
      if (modelConfig) {
        input[modelConfig.inputMapping.prompt || 'prompt'] = prompt;
        input[modelConfig.inputMapping.imageUrl || 'start_image'] = imageUrl;
      } else {
        input.prompt = prompt;
        input.start_image = imageUrl;
      }
    }

    console.log(`Starting video generation with ${endpoint}...`);
    const prediction = await replicate.predictions.create({
      model: endpoint,
      input,
    });

    console.log('Prediction started:', prediction.id);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 