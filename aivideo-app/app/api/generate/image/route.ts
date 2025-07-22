import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey } = await request.json();

    console.log('Image generation request:', { prompt: prompt?.substring(0, 100) + '...', hasApiKey: !!apiKey });

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

    const input = {
      prompt: prompt,
      aspect_ratio: "9:16"
    };

    console.log('Starting Replicate model run with Seedream-3...');
    const prediction = await replicate.predictions.create({
      version: "bytedance/seedream-3",
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