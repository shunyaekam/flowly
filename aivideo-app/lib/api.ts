import { Scene, StoryboardData, storyboardModels } from './store';
import { TOPIC_PROMPTS, GENERAL_PROMPT } from './store';

// Model examples for prompts
const MODEL_EXAMPLES = {
  image_examples: [
    "A cinematic, photorealistic medium shot capturing the nostalgic warmth of a mid-2000s indie film. The focus is a young woman with a sleek, straight bob haircut in cool platinum white with freckled skin, looking directly and intently into the camera lens with a knowing smirk, her head is looking up slightly. She wears an oversized band t-shirt that says \"Seedream 3.0 on Replicate\" in huge stylized text over a long-sleeved striped top and simple silver stud earrings. The lighting is soft, golden hour sunlight creating lens flare and illuminating dust motes in the air. The background shows a blurred outdoor urban setting with graffiti-covered walls (the graffiti says \"seedream\" in stylized graffiti lettering), rendered with a shallow depth of field. Natural film grain, a warm, slightly muted color palette, and sharp focus on her expressive eyes enhance the intimate, authentic feel",
    "A cinematic, photorealistic medium shot capturing the rebellious energy of early 1990s grunge culture. The focus is a young woman with tousled, shoulder-length auburn hair with natural waves and freckled skin, looking directly and intently into the camera lens with a knowing smirk, her head is looking up slightly. She wears an oversized flannel shirt that says \"Seedream 3.0 on Replicate\" in huge stylized text over a band tee and simple hoop earrings. The lighting is moody, overcast daylight filtering through windows creating dramatic shadows. The background shows a blurred indoor coffee shop setting with vintage concert posters covering brick walls (one poster says \"seedream\" in bold concert lettering), rendered with a shallow depth of field. Natural film grain, a desaturated color palette with pops of deep reds and blues, and sharp focus on her expressive eyes enhance the raw, authentic underground feel."
  ],
  video_examples: [
    "a woman points at the words",
    "a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining"
  ],
  sound_examples: [
    "Generate a continuous printer printing sound with periodic beeps and paper movement, plus a cat pawing at the machine. Add subtle ambient room noise for authenticity, keeping the focus on printing, beeps, and the cat's interaction.",
    "Begin by creating a soft, steady background of light pacifier suckling. Add subtle, breathy rhythms to mimic a newborn's gentle mouth movements. Keep the sound smooth, natural, and soothing.",
    "Generate the sound of firecrackers lighting and exploding repeatedly on the ground, followed by fireworks bursting in the sky. Incorporate occasional subtle echoes to mimic an outdoor night ambiance, with no human voices present.",
    "Begin with the sound of hands scooping up loose plastic debris, followed by the subtle cascading noise as the pieces fall and scatter back down. Include soft crinkling and rustling to emphasize the texture of the plastic. Add ambient factory background noise with distant machinery to create an industrial atmosphere."
  ]
};

// Helper function to sanitize filenames
export function safeFilename(s: string): string {
  return s.replace(/[^\w\-_\. ]/g, '_').slice(0, 50);
}

// OpenAI API integration
export async function generateStoryboard(
  userInput: string,
  formatType: string,
  customModes: Record<string, string>,
  apiKey: string,
  generalPrompt: string,
  selectedModel?: string
): Promise<StoryboardData> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  // Get model parameters from the selected model, not sure why we need this section
  const modelConfig = storyboardModels.find(m => m.id === selectedModel);
  
  if (!modelConfig) {
    throw new Error(`Model '${selectedModel}' not found. Please select a valid model in settings.`);
  }

  // Get the topic prompt based on format type
  let topicPrompt: string;
  if (formatType in TOPIC_PROMPTS) {
    topicPrompt = TOPIC_PROMPTS[formatType as keyof typeof TOPIC_PROMPTS].prompt.replace('{input}', userInput);
  } else if (formatType in customModes) {
    topicPrompt = customModes[formatType].replace('{input}', userInput);
  } else {
    topicPrompt = `Create a video script about: ${userInput}`;
  }

  // Build comprehensive system prompt
  const systemPrompt = `You are an expert video storyboard creator. Your task is to create detailed storyboards for TikTok-style videos.

TOPIC PROMPT:
${topicPrompt}

GENERAL INSTRUCTIONS:
${generalPrompt || GENERAL_PROMPT}

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

MODEL EXAMPLES:

Image prompts should be detailed and cinematic like these examples:
${MODEL_EXAMPLES.image_examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

Video prompts should be simple motion descriptions like these examples:
${MODEL_EXAMPLES.video_examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

Sound prompts should be detailed audio descriptions like these examples:
${MODEL_EXAMPLES.sound_examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

IMPORTANT: Your response must be ONLY valid JSON with no additional text, explanations, or markdown formatting.`;

  // Log the model and parameters being used
  console.log('[OpenAI API] Using model:', modelConfig.model_id, 'with params:', modelConfig.params);
  console.log('[OpenAI API] System prompt:', systemPrompt);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.model_id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Input: ${userInput}` }
        ],
        ...modelConfig.params
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate storyboard');
    }

    const data = await response.json();
    const storyboardJson = data.choices[0].message.content;

    // Clean up response
    let cleanedJson = storyboardJson.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.slice(7);
    }
    if (cleanedJson.endsWith('```')) {
      cleanedJson = cleanedJson.slice(0, -3);
    }
    cleanedJson = cleanedJson.trim();

    // Parse and validate
    const storyboardData = JSON.parse(cleanedJson);
    
    if (!storyboardData.scenes || !Array.isArray(storyboardData.scenes)) {
      throw new Error('Invalid storyboard structure');
    }

    // Transform scenes to match our Scene interface
    const scenes: Scene[] = storyboardData.scenes.map((scene: {
      scene: string;
      scene_image_prompt: string;
      scene_video_prompt: string;
      scene_sound_prompt: string;
    }, index: number) => ({
      id: `scene-${index}`,
      scene: scene.scene,
      scene_image_prompt: scene.scene_image_prompt,
      scene_video_prompt: scene.scene_video_prompt,
      scene_sound_prompt: scene.scene_sound_prompt,
      image_generated: false,
      video_generated: false,
      sound_generated: false,
    }));

    return {
      scenes,
      originalPrompt: userInput,
      formatType
    };
  } catch (error) {
    console.error('Storyboard generation error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate storyboard');
  }
}

// Note: Replicate integration is now handled server-side via Next.js API routes

// Image generation using Next.js API route
export async function generateImage(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, apiKey })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        // If response is not JSON, get text content
        try {
          const textContent = await response.text();
          console.error('Non-JSON error response:', textContent);
          errorMessage = `Server error: ${textContent.substring(0, 200)}...`;
        } catch (textError) {
          console.error('Could not read error response:', textError);
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    console.log('Client received data:', JSON.stringify(data, null, 2));
    
    // Extract URL from output - prioritize .url property based on Python script
    if (data.output && data.output.url) {
      return data.output.url;
    } else if (typeof data.output === 'string') {
      return data.output;
    } else if (Array.isArray(data.output) && data.output.length > 0) {
      return data.output[0];
    }
    
    console.error('Unexpected output format:', data.output);
    throw new Error(`Invalid output format from image generation. Received: ${JSON.stringify(data.output)}`);
  } catch (error) {
    console.error('Image generation error:', error);
    throw error;
  }
}

// Video generation using Next.js API route
export async function generateVideo(prompt: string, imageUrl: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('/api/generate/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, imageUrl, apiKey })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate video');
    }

    const data = await response.json();
    
    // Extract URL from output - prioritize .url property based on Python script
    if (data.output && data.output.url) {
      return data.output.url;
    } else if (typeof data.output === 'string') {
      return data.output;
    } else if (Array.isArray(data.output) && data.output.length > 0) {
      return data.output[0];
    }
    
    console.error('Unexpected video output format:', data.output);
    throw new Error(`Invalid output format from video generation. Received: ${JSON.stringify(data.output)}`);
  } catch (error) {
    console.error('Video generation error:', error);
    throw error;
  }
}

// Audio generation using Next.js API route
export async function generateAudio(videoUrl: string, prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('/api/generate/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, videoUrl, apiKey })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate audio');
    }

    const data = await response.json();
    
    // Extract URL from output - prioritize .url property based on Python script
    if (data.output && data.output.url) {
      return data.output.url;
    } else if (typeof data.output === 'string') {
      return data.output;
    } else if (Array.isArray(data.output) && data.output.length > 0) {
      return data.output[0];
    }
    
    console.error('Unexpected audio output format:', data.output);
    throw new Error(`Invalid output format from audio generation. Received: ${JSON.stringify(data.output)}`);
  } catch (error) {
    console.error('Audio generation error:', error);
    throw error;
  }
}

// File download utility
export async function downloadFile(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download file');
  }
  return response.blob();
}

// Create demo storyboard
export function createDemoStoryboard(prompt: string, formatType: string): StoryboardData {
  let scenes: Scene[];
  
  if (formatType === 'conspiracy') {
    scenes = [
      {
        id: 'scene-0',
        scene: "Did you know that the government has been hiding the truth about this for decades?",
        scene_image_prompt: "A cinematic, photorealistic wide shot of a mysterious government facility at dusk, with tall concrete walls and barbed wire fencing. The lighting is moody and dramatic, with artificial floodlights casting long shadows. Security cameras and warning signs are visible. The atmosphere is tense and secretive, shot with a desaturated color palette emphasizing grays and deep blues. High detail, 4K quality, professional cinematography.",
        scene_video_prompt: "Slow, ominous zoom into the facility, with subtle camera shake to create tension",
        scene_sound_prompt: "Generate low, mysterious ambient drone sounds with distant industrial noise and occasional electronic beeps, creating an atmosphere of secrecy and surveillance.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      },
      {
        id: 'scene-1',
        scene: "The official story never made sense, but the evidence was right there in plain sight.",
        scene_image_prompt: "A cinematic close-up shot of classified documents scattered across a dark wooden desk, with a vintage desk lamp casting dramatic shadows. The documents have heavy black redaction marks and official government stamps. Some pages are slightly yellowed with age. The lighting is film noir style, creating high contrast between light and shadow. Shot with shallow depth of field, emphasizing the mysterious nature of the documents.",
        scene_video_prompt: "Camera slowly pans across the documents, with papers slightly rustling in a gentle breeze",
        scene_sound_prompt: "Generate the subtle sound of papers rustling and shuffling, with quiet ambient office noise in the background. Add occasional pen clicks and the distant hum of fluorescent lights.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      },
      {
        id: 'scene-2',
        scene: "What they don't want you to know is that the truth is still out there, waiting to be discovered.",
        scene_image_prompt: "A cinematic medium shot of a lone investigator silhouetted against a window, looking out at a city skyline at night. The figure is backlit, creating a dramatic silhouette. City lights twinkle in the distance, and the atmosphere is contemplative and mysterious. The shot uses high contrast lighting with deep shadows and warm city lights. Professional cinematography with a sense of determination and mystery.",
        scene_video_prompt: "The silhouette remains still while city lights twinkle and move subtly in the background, creating depth",
        scene_sound_prompt: "Generate a contemplative, mysterious ambient soundscape with distant city traffic, occasional car horns, and a subtle wind sound. Add a hint of electronic ambience to suggest ongoing surveillance or mystery.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      }
    ];
  } else {
    // Generic demo for other formats
    scenes = [
      {
        id: 'scene-0',
        scene: "Opening hook that grabs attention immediately",
        scene_image_prompt: `A cinematic, photorealistic medium shot capturing attention with dramatic lighting and composition. The scene is related to: ${prompt}. High detail, 4K quality, professional cinematography with warm color grading.`,
        scene_video_prompt: "Slow, engaging camera movement that draws the viewer in",
        scene_sound_prompt: "Generate atmospheric ambient sounds that match the scene's mood and topic, creating immediate engagement.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      },
      {
        id: 'scene-1',
        scene: "Development of the main concept with key details",
        scene_image_prompt: `A cinematic wide shot showing the main concept in detail, related to: ${prompt}. Dramatic lighting, detailed scene composition, professional cinematography with rich color palette.`,
        scene_video_prompt: "Dynamic camera movement showing key elements, smooth transitions",
        scene_sound_prompt: "Generate detailed audio that enhances the visual narrative, with environmental sounds that match the scene context.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      },
      {
        id: 'scene-2',
        scene: "Compelling conclusion that leaves viewers wanting more",
        scene_image_prompt: `A cinematic close-up or medium shot that provides satisfying conclusion, related to: ${prompt}. Warm, conclusion-appropriate lighting, detailed and polished visual composition.`,
        scene_video_prompt: "Smooth concluding camera movement, peaceful resolution motion",
        scene_sound_prompt: "Generate satisfying conclusion audio with appropriate environmental sounds and subtle musical elements that provide closure.",
        image_generated: false,
        video_generated: false,
        sound_generated: false
      }
    ];
  }

  return {
    scenes,
    originalPrompt: prompt,
    formatType
  };
}

// Save project files
export async function saveProject(storyboard: StoryboardData, scenes: Scene[]): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectName = `aivideo_${timestamp}`;
  
  // Create a zip file using JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  // Create reordered storyboard with visual flow sequence
  const reorderedStoryboard = {
    ...storyboard,
    scenes: scenes // Use the reordered scenes array
  };
  
  // Add storyboard data with correct scene order
  zip.file('storyboard.json', JSON.stringify(reorderedStoryboard, null, 2));
  
  // Add original prompt
  if (storyboard.originalPrompt) {
    zip.file('original_prompt.txt', storyboard.originalPrompt);
  }
  
  // Download and add media files
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneName = safeFilename(scene.scene);
    
    try {
      // Add image
      if (scene.generated_image) {
        const imageBlob = await downloadFile(scene.generated_image);
        zip.file(`scene_${i + 1}_${sceneName}_image.png`, imageBlob);
      }
      
      // Add video (no sound)
      if (scene.generated_video) {
        const videoBlob = await downloadFile(scene.generated_video);
        zip.file(`scene_${i + 1}_${sceneName}_video.mp4`, videoBlob);
      }
      
      // Add final video with sound
      if (scene.generated_sound) {
        const finalBlob = await downloadFile(scene.generated_sound);
        zip.file(`scene_${i + 1}_${sceneName}_final.mp4`, finalBlob);
      }
    } catch (error) {
      console.error(`Error downloading files for scene ${i + 1}:`, error);
    }
  }
  
  // Generate zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 