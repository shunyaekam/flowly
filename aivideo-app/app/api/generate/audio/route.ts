import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { modelRegistry } from "@/lib/model-registry/registry";

export async function POST(request: NextRequest) {
  try {
    const { prompt, videoUrl, apiKey, modelId, customParams } = await request.json();

    console.log('Audio generation request:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      videoUrl: videoUrl?.substring(0, 100) + '...',
      hasApiKey: !!apiKey,
      modelId
    });

    if (!prompt || !videoUrl) {
      return NextResponse.json(
        { error: 'Prompt and videoUrl are required' },
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

    // Use model config if available, otherwise use default Thinksound
    const endpoint = modelConfig ? modelConfig.endpoint : "zsxkib/thinksound:40d08f9f569e91a5d72f6795ebed75178c185b0434699a98c07fc5f566efb2d4";
    let input = modelConfig ? {
      ...modelConfig.defaultParams,
      [modelConfig.inputMapping.prompt || 'caption']: prompt,
      [modelConfig.inputMapping.videoUrl || 'video']: videoUrl
    } : {
      caption: prompt,
      cfg: 5,
      num_inference_steps: 24,
      video: videoUrl,
      cot: prompt,
    };

    // Apply custom parameters if provided
    if (customParams && typeof customParams === 'object') {
      console.log('Applying custom parameters:', customParams);
      input = { ...input, ...customParams };
      // Ensure prompt and videoUrl are still set correctly
      if (modelConfig) {
        input[modelConfig.inputMapping.prompt || 'caption'] = prompt;
        input[modelConfig.inputMapping.videoUrl || 'video'] = videoUrl;
      } else {
        input.caption = prompt;
        input.video = videoUrl;
        input.cot = prompt;
      }
    }

    console.log(`Starting audio generation with ${endpoint}...`);
    const prediction = await replicate.predictions.create({
      version: endpoint,
      input,
    });

    console.log('Prediction started:', prediction.id);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 