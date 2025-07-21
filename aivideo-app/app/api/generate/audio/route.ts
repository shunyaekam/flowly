import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, videoUrl, apiKey } = await request.json();

    console.log('Audio generation request:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      videoUrl: videoUrl?.substring(0, 100) + '...',
      hasApiKey: !!apiKey 
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

    const replicate = new Replicate({
      auth: apiKey,
    });

    const input = {
      caption: prompt,
      cfg: 5,
      num_inference_steps: 24,
      video: videoUrl,
      cot: prompt,
    };

    console.log('Starting audio generation with Thinksound...');
    const prediction = await replicate.predictions.create({
      version: "zsxkib/thinksound:40d08f9f569e91a5d72f6795ebed75178c185b0434699a98c07fc5f566efb2d4",
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