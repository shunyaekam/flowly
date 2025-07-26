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

// Function to fetch model examples dynamically
async function fetchModelExamples(modelId: string, replicateApiKey: string): Promise<string[]> {
  if (!replicateApiKey || !modelId) {
    console.log('Missing API key or model ID for fetchModelExamples');
    return [];
  }
  
  console.log(`Fetching examples for model: ${modelId}`);
  
  try {
    // First try to get the specific model by exact ID from our proxy route
    let response = await fetch(`/api/models?search=${encodeURIComponent(modelId)}`, {
      headers: {
        'x-replicate-token': replicateApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`API response not ok: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    const model = data.results?.find((m: any) => `${m.owner}/${m.name}` === modelId);
    
    if (!model) {
      console.log(`Model ${modelId} not found in search results`);
      return [];
    }

    console.log('Found model:', model.name, 'by', model.owner);

    const examples = [];
    
    // Get examples from multiple sources
    if (model.default_example?.input) {
      const input = model.default_example.input;
      console.log('Found default_example.input:', input);
      
      // Extract all available prompts
      if (input.prompt) examples.push(input.prompt);
      if (input.image_prompt) examples.push(input.image_prompt);
      if (input.video_prompt) examples.push(input.video_prompt);
      if (input.audio_prompt) examples.push(input.audio_prompt);
      if (input.text) examples.push(input.text);
      if (input.description) examples.push(input.description);
      if (input.input_text) examples.push(input.input_text);
      if (input.query) examples.push(input.query);
    } else {
      console.log('No default_example.input found');
    }

    // Also check if there are example predictions or versions with examples
    if (model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties) {
      const props = model.latest_version.openapi_schema.components.schemas.Input.properties;
      console.log('Found schema properties:', Object.keys(props));
      
      // Look for examples in schema properties
      Object.entries(props).forEach(([key, prop]: [string, any]) => {
        if (prop.example && typeof prop.example === 'string' && prop.example.length > 10) {
          console.log(`Found example in ${key}:`, prop.example.substring(0, 50) + '...');
          examples.push(prop.example);
        }
        if (prop.examples && Array.isArray(prop.examples)) {
          prop.examples.forEach((ex: any) => {
            if (typeof ex === 'string' && ex.length > 10) {
              console.log(`Found example in ${key}.examples:`, ex.substring(0, 50) + '...');
              examples.push(ex);
            }
          });
        }
      });
    } else {
      console.log('No schema properties found');
    }
    
    console.log(`Found ${examples.length} examples for ${modelId}`);
    
    // Remove duplicates and return up to 5 examples
    const uniqueExamples = [...new Set(examples)].slice(0, 5);
    console.log('Returning examples:', uniqueExamples.map(ex => ex.substring(0, 100) + '...'));
    return uniqueExamples;
    
  } catch (error) {
    console.error(`Failed to fetch model examples for ${modelId}:`, error);
    return [];
  }
}

// OpenAI API integration
export async function generateStoryboard(
  userInput: string,
  formatType: string,
  customModes: Record<string, string>,
  apiKey: string,
  generalPrompt: string,
  selectedModel?: string,
  selectedImageModel?: string,
  selectedVideoModel?: string,
  selectedAudioModel?: string,
  replicateApiKey?: string
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

  // Fetch dynamic model examples if possible
  let imageExamples = MODEL_EXAMPLES.image_examples;
  let videoExamples = MODEL_EXAMPLES.video_examples;
  let soundExamples = MODEL_EXAMPLES.sound_examples;

  if (replicateApiKey) {
    try {
      const [dynamicImageExamples, dynamicVideoExamples, dynamicAudioExamples] = await Promise.all([
        selectedImageModel ? fetchModelExamples(selectedImageModel, replicateApiKey) : Promise.resolve([]),
        selectedVideoModel ? fetchModelExamples(selectedVideoModel, replicateApiKey) : Promise.resolve([]),
        selectedAudioModel ? fetchModelExamples(selectedAudioModel, replicateApiKey) : Promise.resolve([])
      ]);

      // Use dynamic examples if available, fall back to static ones
      if (dynamicImageExamples.length > 0) imageExamples = dynamicImageExamples;
      if (dynamicVideoExamples.length > 0) videoExamples = dynamicVideoExamples;
      if (dynamicAudioExamples.length > 0) soundExamples = dynamicAudioExamples;
    } catch (error) {
      console.error('Failed to fetch dynamic model examples, using static ones:', error);
    }
  }

  // Build comprehensive system prompt
  const systemPrompt = `You are an expert video storyboard creator. Your task is to create detailed storyboards for TikTok-style videos.\n\nTOPIC PROMPT:\n${topicPrompt}\n\nGENERAL INSTRUCTIONS:\n${generalPrompt || GENERAL_PROMPT}\n\nFORMAT:\n{\n  "scenes": [\n    {\n      "scene": "Scene script",\n      "scene_image_prompt": "...",\n      "scene_video_prompt": "...",\n      "scene_sound_prompt": "..."\n    },\n    ...\n  ]\n}\n\nMODEL EXAMPLES:\n\nImage prompts should be detailed and cinematic like these examples:\n${imageExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\nVideo prompts should be simple motion descriptions like these examples:\n${videoExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\nSound prompts should be detailed audio descriptions like these examples:\n${soundExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\nIMPORTANT: Your response must be ONLY valid JSON with no additional text, explanations, or markdown formatting.`;

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

type Prediction = {
  id: string;
};

// Note: Replicate integration is now handled server-side via Next.js API routes

// Image generation using Next.js API route
export async function generateImage(prompt: string, apiKey: string, modelId?: string, signal?: AbortSignal, customParams?: Record<string, any>): Promise<Prediction> {
  try {
    const response = await fetch('/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, apiKey, modelId, customParams }),
      signal
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

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image generation was cancelled');
    }
    console.error('Image generation error:', error);
    throw error;
  }
}

// Video generation using Next.js API route
export async function generateVideo(prompt: string, imageUrl: string, apiKey: string, modelId?: string, signal?: AbortSignal, customParams?: Record<string, any>): Promise<Prediction> {
  try {
    const response = await fetch('/api/generate/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, imageUrl, apiKey, modelId, customParams }),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start video generation');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Video generation was cancelled');
    }
    console.error('Video generation error:', error);
    throw error;
  }
}

// Audio generation using Next.js API route
export async function generateAudio(videoUrl: string, prompt: string, apiKey: string, modelId?: string, signal?: AbortSignal, customParams?: Record<string, any>): Promise<Prediction> {
  try {
    const response = await fetch('/api/generate/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, videoUrl, apiKey, modelId, customParams }),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start audio generation');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Audio generation was cancelled');
    }
    console.error('Audio generation error:', error);
    throw error;
  }
}

// Poll for prediction result
export async function pollForPrediction(predictionId: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  while (true) {
    if (signal?.aborted) {
      throw new Error('Polling was cancelled');
    }
    
    try {
      const response = await fetch(`/api/predictions/${predictionId}`, {
        headers: {
          'x-replicate-api-key': apiKey,
        },
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch prediction');
      }

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        if (prediction.output && typeof prediction.output === 'string') {
          return prediction.output;
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          return prediction.output[0];
        } else {
          throw new Error('Invalid prediction output format');
        }
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`Prediction failed with status: ${prediction.status}`);
      }

      // Use AbortController for the timeout as well
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, 2000);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Polling was cancelled'));
          });
        }
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Polling was cancelled');
      }
      console.error('Polling error:', error);
      throw error;
    }
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