import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  try {
    const { prompt, video_url, model, params, replicate_token } = await request.json();

    if (!replicate_token) {
      return NextResponse.json({ error: 'Replicate API token is required' }, { status: 400 });
    }

    if (!video_url) {
      return NextResponse.json({ error: 'Video URL is required for sound generation' }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: replicate_token,
    });

    const output = await replicate.run(
      model,
      {
        input: {
          caption: prompt,
          video: video_url,
          cot: prompt,
          ...params
        }
      }
    );

    return NextResponse.json({ url: output });
  } catch (error) {
    console.error('Error generating sound:', error);
    return NextResponse.json({ error: 'Failed to generate sound' }, { status: 500 });
  }
} 