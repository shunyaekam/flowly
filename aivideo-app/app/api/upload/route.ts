import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

// Global cache for API keys (in production, use Redis or database)
declare global {
  var fileApiKeys: Record<string, string> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const apiKey = formData.get('apiKey') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Replicate API key is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'video/mp4', 'video/mov', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    console.log('Uploading file to Replicate:', { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    });

    const replicate = new Replicate({
      auth: apiKey,
    });

    // Upload via direct HTTP API since SDK is having issues
    const uploadFormData = new FormData();
    uploadFormData.append('content', file);
    
    const uploadResponse = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Replicate upload failed: ${uploadResponse.status} ${errorText}`);
    }

    const fileResponse = await uploadResponse.json();

    console.log('File uploaded to Replicate:', fileResponse);

    // Calculate expiration (24 hours for uploaded files)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store API key in a simple cache for proxy use (in production, use Redis or DB)
    global.fileApiKeys = global.fileApiKeys || {};
    global.fileApiKeys[fileResponse.id] = apiKey;
    
    // Create a proxy URL that doesn't expose the API key
    const proxyUrl = `/api/file-proxy/${fileResponse.id}`;
    
    console.log('File URL for display:', proxyUrl);

    return NextResponse.json({
      id: fileResponse.id,
      url: proxyUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      expiresAt: expiresAt.toISOString(),
      replicateUrl: fileResponse.urls?.get // Store original URL for reference
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle specific Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Invalid Replicate API key' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}