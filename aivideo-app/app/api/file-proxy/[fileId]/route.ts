import { NextRequest, NextResponse } from "next/server";

// Global cache for API keys (set during upload)
declare global {
  var fileApiKeys: Record<string, string> | undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    // Get API key from global cache (set during upload)
    const apiKey = global.fileApiKeys?.[fileId];

    if (!apiKey) {
      return NextResponse.json(
        { error: 'File not found or API key expired' },
        { status: 401 }
      );
    }

    // Directly fetch the file content using the authenticated URL
    const fileResponse = await fetch(`https://api.replicate.com/v1/files/${fileId}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': '*/*',
      },
    });

    if (!fileResponse.ok) {
      console.error(`Failed to fetch file ${fileId}:`, fileResponse.status, fileResponse.statusText);
      return NextResponse.json(
        { error: `Failed to fetch file: ${fileResponse.status}` },
        { status: fileResponse.status }
      );
    }

    // Check if this is JSON metadata or actual file content
    const contentType = fileResponse.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // This is metadata, we need to get the actual file
      const fileMetadata = await fileResponse.json();
      console.log('File metadata:', fileMetadata);
      
      // The file content should be accessible directly at the file URL with proper auth
      const actualFileResponse = await fetch(`https://api.replicate.com/v1/files/${fileId}`, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Accept': fileMetadata.content_type || 'image/*',
        },
      });
      
      if (!actualFileResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download file content: ${actualFileResponse.status}` },
          { status: actualFileResponse.status }
        );
      }
      
      // Stream the actual file content
      return new NextResponse(actualFileResponse.body, {
        status: 200,
        headers: {
          'Content-Type': fileMetadata.content_type || 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      // This is already the file content
      return new NextResponse(fileResponse.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'File proxy failed' },
      { status: 500 }
    );
  }
}