import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl, apiKey } = await request.json();

    console.log('Video generation request:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      imageUrl: imageUrl?.substring(0, 100) + '...',
      hasApiKey: !!apiKey 
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

    const replicate = new Replicate({
      auth: apiKey,
    });

    const input = {
      prompt: prompt,
      start_image: imageUrl,
      mode: "pro"
    };

    console.log('Starting video generation with Kling v2.1...');
    const prediction = await replicate.predictions.create({
      version: "kwaivgi/kling-v2.1",
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