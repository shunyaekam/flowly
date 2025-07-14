import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode, openai_api_key, general_prompt } = await request.json();

    if (!openai_api_key) {
      return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: openai_api_key,
    });

    // Build the system prompt using the mode template
    const modePrompt = mode.prompt_template.replace('{input}', prompt);
    
    const systemPrompt = `You are an expert video storyboard creator. Your task is to create detailed storyboards for TikTok-style videos.

TOPIC PROMPT:
${modePrompt}

GENERAL INSTRUCTIONS:
${general_prompt}

FORMAT:
{
  "scenes": [
    {
      "scene": "Scene script",
      "scene_image_prompt": "...",
      "scene_video_prompt": "...",
      "scene_sound_prompt": "..."
    },
    ...
  ]
}

IMPORTANT GUIDELINES:
- Image prompts should be detailed and cinematic (200+ words)
- Video prompts should describe camera movement and motion (50-100 words)
- Sound prompts should describe audio atmosphere and effects (50-100 words)
- Create 6-10 scenes for a complete video
- Each scene should be engaging and visually distinct
- Use {input} references in a natural way
- Output ONLY valid JSON with no additional text or markdown formatting`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a storyboard for: ${prompt}` }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const storyboardText = response.choices[0].message.content;
    
    if (!storyboardText) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    // Clean up the response
    let cleanedText = storyboardText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    // Parse JSON
    let storyboardData;
    try {
      storyboardData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON response from OpenAI' }, { status: 500 });
    }

    // Validate structure
    if (!storyboardData.scenes || !Array.isArray(storyboardData.scenes)) {
      return NextResponse.json({ error: 'Invalid storyboard structure' }, { status: 500 });
    }

    // Add IDs and default states to scenes
    interface RawScene {
      scene?: string;
      scene_image_prompt?: string;
      scene_video_prompt?: string;
      scene_sound_prompt?: string;
    }
    
    const scenesWithIds = storyboardData.scenes.map((scene: RawScene, index: number) => ({
      id: (index + 1).toString(),
      scene_text: scene.scene || '',
      scene_image_prompt: scene.scene_image_prompt || '',
      scene_video_prompt: scene.scene_video_prompt || '',
      scene_sound_prompt: scene.scene_sound_prompt || '',
      image_generated: false,
      video_generated: false,
      sound_generated: false,
      is_generating_image: false,
      is_generating_video: false,
      is_generating_sound: false,
    }));

    // Return formatted storyboard data
    const finalStoryboard = {
      scenes: scenesWithIds,
      original_prompt: prompt,
      mode: mode.name,
      model: 'gpt-4o',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(finalStoryboard);
  } catch (error) {
    console.error('Error generating storyboard:', error);
    return NextResponse.json({ error: 'Failed to generate storyboard' }, { status: 500 });
  }
} 