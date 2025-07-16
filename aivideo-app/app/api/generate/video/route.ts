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
    const output = await replicate.run(
      "kwaivgi/kling-v2.1",
      { input }
    );

    console.log('Video output received:');
    console.log('- Type:', typeof output);
    console.log('- Is Array:', Array.isArray(output));
    console.log('- Is ReadableStream:', output instanceof ReadableStream);
    
    // Handle ReadableStream response (contains actual video binary data)
    if (output instanceof ReadableStream) {
      console.log('Converting ReadableStream to video data...');
      const reader = output.getReader();
      const chunks = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const blob = new Blob(chunks);
        const arrayBuffer = await blob.arrayBuffer();
        
        // Check if it's binary video data (MP4 magic bytes)
        const uint8Array = new Uint8Array(arrayBuffer);
        const isVideoData = uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70; // "ftyp" in MP4
        
        if (isVideoData) {
          console.log('Detected MP4 video data, converting to base64...');
          // Convert binary video data to base64 data URL
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:video/mp4;base64,${base64}`;
          console.log('Generated video data URL, length:', dataUrl.length);
          return NextResponse.json({ output: dataUrl });
        } else {
          // Try to decode as text (fallback for URL)
          const text = new TextDecoder().decode(arrayBuffer);
          console.log('Stream content as text:', text.substring(0, 200));
          
          // Try to parse as JSON or use as direct URL
          try {
            const parsed = JSON.parse(text);
            console.log('Parsed stream JSON:', parsed);
            return NextResponse.json({ output: parsed.url || parsed });
          } catch {
            console.log('Stream content is direct URL:', text);
            return NextResponse.json({ output: text.trim() });
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    
    // Handle direct URL response (as expected from docs)
    if (typeof output === 'string') {
      console.log('Direct video URL output:', output);
      return NextResponse.json({ output });
    }
    
    // Handle array response
    if (Array.isArray(output) && output.length > 0) {
      console.log('Array video output:', output);
      return NextResponse.json({ output: output[0] });
    }
    
    console.log('Unexpected video output format:', output);
    return NextResponse.json({ output });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 