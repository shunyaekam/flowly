import { create } from 'zustand';

// Types
export interface Scene {
  id: string;
  scene: string;
  scene_image_prompt: string;
  scene_video_prompt: string;
  scene_sound_prompt: string;
  generated_image?: string;
  generated_video?: string;
  generated_sound?: string;
  image_generated: boolean;
  video_generated: boolean;
  sound_generated: boolean;
  position?: { x: number; y: number };
}

export interface StoryboardData {
  scenes: Scene[];
  originalPrompt?: string;
  formatType?: string;
}

export interface Settings {
  openai_api_key: string;
  replicate_api_key: string;
  general_prompt: string;
  mode_prompts: Record<string, string>;
  selected_storyboard_model: string;
  selected_image_model: string;
  selected_video_model: string;
  selected_audio_model: string;
}

export interface AppState {
  // Navigation
  currentView: 'input' | 'storyboard';
  setCurrentView: (view: 'input' | 'storyboard') => void;
  
  // Storyboard data
  storyboardData: StoryboardData | null;
  setStoryboardData: (data: StoryboardData) => void;
  
  // Settings
  settings: Settings;
  setSettings: (settings: Settings) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  
  // Generation modes
  selectedMode: string;
  setSelectedMode: (mode: string) => void;
  customModes: Record<string, string>;
  addCustomMode: (name: string, prompt: string) => void;
  
  // Scene management
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  updateScenePosition: (sceneId: string, position: { x: number; y: number }) => void;
  
  // Scene viewer overlay
  editingSceneId: string | null;
  setEditingSceneId: (sceneId: string | null) => void;
  sceneViewTab: 'script' | 'image' | 'video' | 'audio';
  setSceneViewTab: (tab: 'script' | 'image' | 'video' | 'audio') => void;
  
  // Generation state
  generatingScenes: Set<string>;
  setGeneratingScene: (sceneId: string, generating: boolean) => void;
}

// Available models
export const storyboardModels = [
  {
    id: 'gpt-4o',
    name: 'OpenAI 4o',
    model_id: 'gpt-4o',
    params: { temperature: 0.7 }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    model_id: 'gpt-4-turbo',
    params: { temperature: 0.7 }
  }
];

export const imageModels = [
  { id: 'seedream', name: 'Seedream' },
  { id: 'dall-e-3', name: 'DALL-E 3' },
  { id: 'stable-diffusion', name: 'Stable Diffusion' }
];

export const videoModels = [
  { id: 'kling-2.1-pro', name: 'Kling 2.1 Pro' },
  { id: 'runway-gen2', name: 'Runway Gen-2' },
  { id: 'pika-labs', name: 'Pika Labs' }
];

export const audioModels = [
  { id: 'multi', name: 'Multi' },
  { id: 'musicgen', name: 'MusicGen' },
  { id: 'audioldm', name: 'AudioLDM' }
];

// Import topic prompts from JSON file
export { TOPIC_PROMPTS } from './prompt-loader';

// General instructions
export const GENERAL_PROMPT = `Make sure not to use em dashes (use commas instead) and other punctuation that would confuse the script reader (who is a robot). Next, with the scene informations, generate prompts for the images, the videos (that will be made with the images) and the sound for the scenes. The prompts should be as long and detailed as possible or should be, since it needs to look alluring. Output all scenes (including the hook) with their corresponding prompts in the format and only respond with the finalized format. The format and example prompts are listed below, pay close attention.`;

// Example prompts for settings modal
export const EXAMPLE_PROMPTS = `Scene 1:
Image Prompt: "A cinematic, photorealistic wide shot of a mysterious laboratory at twilight. Blue-tinted lighting, dramatic shadows, film grain, desaturated colors."
Video Prompt: "Slow zoom into the laboratory entrance, subtle camera movement, 3 seconds"
Sound Prompt: "Ambient mysterious tones with electronic hums and distant mechanical sounds"

Scene 2:
Image Prompt: "Close-up shot of ancient documents on a dark wooden table, lit by candlelight. High contrast, shallow depth of field, warm color grading."
Video Prompt: "Camera slowly pans across the documents, revealing hidden details"
Sound Prompt: "Paper rustling sounds with subtle tension-building ambient music"`;

// Persistence helpers
const STORAGE_KEY = 'aivideo-settings';

export const saveSettingsToStorage = (settings: Settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettingsFromStorage = (): Partial<Settings> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {};
  }
};

// Create store
export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'input',
  setCurrentView: (view) => set({ currentView: view }),
  
  // Storyboard data
  storyboardData: null,
  setStoryboardData: (data) => {
    // Initialize scene positions with logical sequential layout
    const scenes = data.scenes.map((scene, index) => {
      // Only set initial position if scene doesn't already have one
      if (!scene.position) {
        const sceneCount = data.scenes.length;
        const startX = 150;
        const startY = 150;
        const horizontalGap = 250;
        const verticalGap = 200;
        
        // Determine optimal layout based on scene count
        let nodesPerRow;
        if (sceneCount <= 3) nodesPerRow = sceneCount;
        else if (sceneCount <= 6) nodesPerRow = 3;
        else if (sceneCount <= 9) nodesPerRow = 3;
        else nodesPerRow = 4;
        
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;
        
        // Center each row based on how many items it has
        const itemsInRow = Math.min(nodesPerRow, sceneCount - row * nodesPerRow);
        const rowStartX = startX - ((itemsInRow - 1) * horizontalGap) / 2;
        
        const x = rowStartX + col * horizontalGap;
        const y = startY + row * verticalGap;
        
        scene.position = { x, y };
      }
      
      return {
        ...scene,
        id: scene.id || `scene-${index}`,
        image_generated: scene.image_generated || false,
        video_generated: scene.video_generated || false,
        sound_generated: scene.sound_generated || false
      };
    });
    
    set({ storyboardData: { ...data, scenes } });
  },
  
  // Settings
  settings: (() => {
    const stored = loadSettingsFromStorage();
    return {
      openai_api_key: stored.openai_api_key || '',
      replicate_api_key: stored.replicate_api_key || '',
      general_prompt: stored.general_prompt || GENERAL_PROMPT,
      mode_prompts: stored.mode_prompts || {},
      selected_storyboard_model: stored.selected_storyboard_model || 'gpt-4o',
      selected_image_model: stored.selected_image_model || 'seedream',
      selected_video_model: stored.selected_video_model || 'kling-2.1-pro',
      selected_audio_model: stored.selected_audio_model || 'multi'
    };
  })(),
  setSettings: (settings) => {
    saveSettingsToStorage(settings);
    set({ settings });
  },
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  
  // Generation modes
  selectedMode: 'conspiracy',
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  customModes: {},
  addCustomMode: (name, prompt) => set((state) => ({
    customModes: { ...state.customModes, [name]: prompt }
  })),
  
  // Scene management
  updateScene: (sceneId, updates) => set((state) => {
    if (!state.storyboardData) return state;
    
    const scenes = state.storyboardData.scenes.map(scene =>
      scene.id === sceneId ? { ...scene, ...updates } : scene
    );
    
    return {
      storyboardData: { ...state.storyboardData, scenes }
    };
  }),
  
  updateScenePosition: (sceneId, position) => set((state) => {
    if (!state.storyboardData) return state;
    
    const scenes = state.storyboardData.scenes.map(scene =>
      scene.id === sceneId ? { ...scene, position } : scene
    );
    
    return {
      storyboardData: { ...state.storyboardData, scenes }
    };
  }),
  
  // Scene viewer overlay
  editingSceneId: null,
  setEditingSceneId: (sceneId) => set({ editingSceneId: sceneId }),
  sceneViewTab: 'image',
  setSceneViewTab: (tab) => set({ sceneViewTab: tab }),
  
  // Generation state
  generatingScenes: new Set(),
  setGeneratingScene: (sceneId, generating) => set((state) => {
    const newSet = new Set(state.generatingScenes);
    if (generating) {
      newSet.add(sceneId);
    } else {
      newSet.delete(sceneId);
    }
    return { generatingScenes: newSet };
  })
})); 