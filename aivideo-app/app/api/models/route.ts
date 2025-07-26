import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = searchParams.get('limit') || '25';
  const apiKey = request.headers.get('x-replicate-token');

  if (!apiKey) {
    return NextResponse.json({ error: 'Replicate API key required' }, { status: 401 });
  }

  try {
    let url = `https://api.replicate.com/v1/models?`;
    
    if (cursor) {
      url += `cursor=${cursor}&`;
    }
    url += `limit=${limit}`;
    
    console.log('Fetching models from URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-replicate-token');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Replicate API key required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const searchQuery = body.query;
    
    if (!searchQuery || searchQuery.trim() === '') {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    console.log('Performing search for:', searchQuery);
    console.log('Using API key:', apiKey ? 'PRESENT' : 'MISSING');
    
    const response = await fetch(`https://api.replicate.com/v1/models`, {
      method: 'QUERY',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'text/plain'
      },
      body: searchQuery
    });

    console.log('Search response status:', response.status);
    console.log('Search response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw response text:', responseText.substring(0, 200) + '...');
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response was not valid JSON:', responseText);
      throw new Error('Invalid JSON response from Replicate API');
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Models search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search models' }, 
      { status: 500 }
    );
  }
}