import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, params, replicate_token } = await request.json();

    if (!replicate_token) {
      return NextResponse.json({ error: 'Replicate API token is required' }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: replicate_token,
    });

    const output = await replicate.run(
      model,
      {
        input: {
          prompt,
          ...params
        }
      }
    );

    return NextResponse.json({ url: output });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
} 