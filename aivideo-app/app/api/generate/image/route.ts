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
    const output = await replicate.run(
      "bytedance/seedream-3",
      { input }
    );

    console.log('Replicate output received:');
    console.log('- Type:', typeof output);
    console.log('- Is Array:', Array.isArray(output));
    console.log('- Is ReadableStream:', output instanceof ReadableStream);
    console.log('- Raw structure:', JSON.stringify(output, null, 2));
    
    // Handle ReadableStream response (contains actual image binary data)
    if (output instanceof ReadableStream) {
      console.log('Converting ReadableStream to image data...');
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
        
        // Check if it's binary image data
        const uint8Array = new Uint8Array(arrayBuffer);
        const isImageData = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8; // JPEG magic bytes
        
        if (isImageData) {
          console.log('Detected JPEG image data, converting to base64...');
          // Convert binary image data to base64 data URL
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          console.log('Generated data URL, length:', dataUrl.length);
          return NextResponse.json({ output: dataUrl });
        } else {
          // Try to decode as text (fallback)
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
      console.log('Direct URL output:', output);
      return NextResponse.json({ output });
    }
    
    // Handle array response
    if (Array.isArray(output) && output.length > 0) {
      console.log('Array output:', output);
      return NextResponse.json({ output: output[0] });
    }
    
    console.log('Unexpected output format:', output);
    return NextResponse.json({ output });
  } catch (error) {
    console.error('Image generation error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during image generation' },
      { status: 500 }
    );
  }
} 