import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { modelRegistry } from "@/lib/model-registry/registry";

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

    // Try to get model config from registry, if not found, fetch directly from Replicate
    let modelConfig = null;
    if (modelId) {
      modelConfig = await modelRegistry.getModel(modelId);
      
      // If not in registry, try fetching from Replicate directly
      if (!modelConfig) {
        console.log(`Model ${modelId} not in registry, fetching from Replicate...`);
        try {
          const replicateResponse = await fetch(`https://api.replicate.com/v1/models`, {
            method: 'QUERY',
            headers: {
              'Authorization': `Token ${apiKey}`,
              'Content-Type': 'text/plain'
            },
            body: modelId
          });
          
          if (replicateResponse.ok) {
            const data = await replicateResponse.json();
            const model = data.results?.find((m: any) => `${m.owner}/${m.name}` === modelId);
            
            if (model && model.latest_version?.id) {
              console.log(`Found model ${modelId} with version ${model.latest_version.id}`);
              // Create a simple config for this model
              modelConfig = {
                endpoint: modelId,
                version: model.latest_version.id,
                defaultParams: {},
                inputMapping: { prompt: 'prompt' }
              };
            }
          }
        } catch (error) {
          console.error('Failed to fetch model from Replicate:', error);
        }
      }
    }

    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Ensure we have a proper version hash
    if (!modelConfig.version) {
      return NextResponse.json(
        { error: `Model ${modelConfig.endpoint} missing version hash` },
        { status: 400 }
      );
    }
    
    // Build proper endpoint with version
    const endpoint = modelConfig.endpoint.includes(':') 
      ? modelConfig.endpoint 
      : `${modelConfig.endpoint}:${modelConfig.version}`;
    
    let input = {
      ...modelConfig.defaultParams,
      [modelConfig.inputMapping.prompt || 'prompt']: prompt
    };

    // Apply custom parameters if provided
    if (customParams && typeof customParams === 'object') {
      console.log('Applying custom parameters:', customParams);
      input = { ...input, ...customParams };
      // Ensure prompt is still set correctly
      input[modelConfig.inputMapping.prompt || 'prompt'] = prompt;
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