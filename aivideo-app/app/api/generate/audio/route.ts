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
    const output = await replicate.run(
      "zsxkib/thinksound:40d08f9f569e91a5d72f6795ebed75178c185b0434699a98c07fc5f566efb2d4",
      { input }
    );

    console.log('Audio output received:');
    console.log('- Type:', typeof output);
    console.log('- Is Array:', Array.isArray(output));
    console.log('- Is ReadableStream:', output instanceof ReadableStream);
    
    // Handle ReadableStream response (contains actual audio binary data)
    if (output instanceof ReadableStream) {
      console.log('Converting ReadableStream to audio data...');
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
        
        // Check if it's binary audio data (common audio formats)
        const uint8Array = new Uint8Array(arrayBuffer);
        const isMP3 = uint8Array[0] === 0xFF && (uint8Array[1] & 0xE0) === 0xE0; // MP3 frame header
        const isWAV = uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46; // "RIFF"
        const isAudioData = isMP3 || isWAV;
        
        if (isAudioData) {
          const mimeType = isMP3 ? 'audio/mpeg' : 'audio/wav';
          console.log(`Detected ${mimeType} audio data, converting to base64...`);
          // Convert binary audio data to base64 data URL
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          console.log('Generated audio data URL, length:', dataUrl.length);
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
      console.log('Direct audio URL output:', output);
      return NextResponse.json({ output });
    }
    
    // Handle array response
    if (Array.isArray(output) && output.length > 0) {
      console.log('Array audio output:', output);
      return NextResponse.json({ output: output[0] });
    }
    
    console.log('Unexpected audio output format:', output);
    return NextResponse.json({ output });
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 