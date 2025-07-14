import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  try {
    const { prompt, image_url, model, params, replicate_token } = await request.json();

    if (!replicate_token) {
      return NextResponse.json({ error: 'Replicate API token is required' }, { status: 400 });
    }

    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required for video generation' }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: replicate_token,
    });

    const output = await replicate.run(
      model,
      {
        input: {
          prompt,
          start_image: image_url,
          ...params
        }
      }
    );

    return NextResponse.json({ url: output });
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
} 