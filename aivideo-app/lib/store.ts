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
  // Per-scene model selection (optional - falls back to global settings)
  selected_image_model?: string;
  selected_video_model?: string;
  selected_audio_model?: string;
  // Per-scene model parameter overrides (only stores customizations)
  image_model_overrides?: Record<string, unknown>;
  video_model_overrides?: Record<string, unknown>;
  audio_model_overrides?: Record<string, unknown>;
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
  // Global model parameters
  image_model_params?: Record<string, unknown>;
  video_model_params?: Record<string, unknown>;
  audio_model_params?: Record<string, unknown>;
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
  updateSceneModelOverrides: (sceneId: string, type: 'image' | 'video' | 'audio', overrides: Record<string, unknown>) => void;
  
  // Scene viewer overlay
  editingSceneId: string | null;
  setEditingSceneId: (sceneId: string | null) => void;
  sceneViewTab: 'script' | 'image' | 'video' | 'audio';
  setSceneViewTab: (tab: 'script' | 'image' | 'video' | 'audio') => void;
  
  // Visual scene order (follows React Flow connections)
  visualSceneOrder: Scene[];
  setVisualSceneOrder: (scenes: Scene[]) => void;
  
  // Generation state
  generatingScenes: Set<string>;
  setGeneratingScene: (sceneId: string, generating: boolean) => void;
  
  // Enhanced generation state management
  sceneGenerationStates: Map<string, Map<'image' | 'video' | 'audio', boolean>>;
  generationCancellation: Map<string, AbortController>;
  generateAllCancelled: boolean;
  setSceneGenerationState: (sceneId: string, type: 'image' | 'video' | 'audio', generating: boolean) => void;
  getSceneGenerationState: (sceneId: string, type: 'image' | 'video' | 'audio') => boolean;
  cancelGeneration: (sceneId: string, type: 'image' | 'video' | 'audio') => void;
  setGenerateAllCancelled: (cancelled: boolean) => void;
  resetStoryboard: () => void;
  loadInitialSettings: () => void;

}



// Available models
export const storyboardModels = [
  // GPT/Chat/Reasoning models
  { id: 'gpt-4o', name: 'GPT-4o', model_id: 'gpt-4o', params: { temperature: 0.7 } },
  { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o-latest', model_id: 'chatgpt-4o-latest', params: { temperature: 0.7 } },
  { id: 'gpt-4o-2024-05-13', name: 'GPT-4o (2024-05-13)', model_id: 'gpt-4o-2024-05-13', params: { temperature: 0.7 } },
  { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (2024-08-06)', model_id: 'gpt-4o-2024-08-06', params: { temperature: 0.7 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', model_id: 'gpt-4o-mini', params: { temperature: 0.7 } },
  { id: 'gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (2024-07-18)', model_id: 'gpt-4o-mini-2024-07-18', params: { temperature: 0.7 } },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', model_id: 'gpt-4-turbo', params: { temperature: 0.7 } },
  { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (2024-04-09)', model_id: 'gpt-4-turbo-2024-04-09', params: { temperature: 0.7 } },
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', model_id: 'gpt-4-turbo-preview', params: { temperature: 0.7 } },
  { id: 'gpt-4-0125-preview', name: 'GPT-4 0125 Preview', model_id: 'gpt-4-0125-preview', params: { temperature: 0.7 } },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 1106 Preview', model_id: 'gpt-4-1106-preview', params: { temperature: 0.7 } },
  { id: 'gpt-4-0613', name: 'GPT-4 0613', model_id: 'gpt-4-0613', params: { temperature: 0.7 } },
  { id: 'gpt-4', name: 'GPT-4', model_id: 'gpt-4', params: { temperature: 0.7 } },
  { id: 'gpt-4.1', name: 'GPT-4.1', model_id: 'gpt-4.1', params: { temperature: 0.7 } },
  { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1 (2025-04-14)', model_id: 'gpt-4.1-2025-04-14', params: { temperature: 0.7 } },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', model_id: 'gpt-4.1-mini', params: { temperature: 0.7 } },
  { id: 'gpt-4.1-mini-2025-04-14', name: 'GPT-4.1 Mini (2025-04-14)', model_id: 'gpt-4.1-mini-2025-04-14', params: { temperature: 0.7 } },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', model_id: 'gpt-4.1-nano', params: { temperature: 0.7 } },
  { id: 'gpt-4.1-nano-2025-04-14', name: 'GPT-4.1 Nano (2025-04-14)', model_id: 'gpt-4.1-nano-2025-04-14', params: { temperature: 0.7 } },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', model_id: 'gpt-3.5-turbo', params: { temperature: 0.7 } },
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (0125)', model_id: 'gpt-3.5-turbo-0125', params: { temperature: 0.7 } },
  { id: 'gpt-3.5-turbo-1106', name: 'GPT-3.5 Turbo (1106)', model_id: 'gpt-3.5-turbo-1106', params: { temperature: 0.7 } },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', model_id: 'gpt-3.5-turbo-16k', params: { temperature: 0.7 } },
  // O models (excluding deep research and pro variants)
  { id: 'o1-preview', name: 'O1 Preview', model_id: 'o1-preview', params: { reasoning_effort: 'medium' } },
  { id: 'o1-preview-2024-09-12', name: 'O1 Preview (2024-09-12)', model_id: 'o1-preview-2024-09-12', params: { reasoning_effort: 'medium' } },
  { id: 'o1-mini', name: 'O1 Mini', model_id: 'o1-mini', params: { reasoning_effort: 'medium' } },
  { id: 'o1-mini-2024-09-12', name: 'O1 Mini (2024-09-12)', model_id: 'o1-mini-2024-09-12', params: { reasoning_effort: 'medium' } },
  { id: 'o1', name: 'O1', model_id: 'o1', params: { reasoning_effort: 'medium' } },
  { id: 'o1-2024-12-17', name: 'O1 (2024-12-17)', model_id: 'o1-2024-12-17', params: { reasoning_effort: 'medium' } },
  { id: 'o3-mini', name: 'O3 Mini', model_id: 'o3-mini', params: { reasoning_effort: 'medium' } },
  { id: 'o3-mini-2025-01-31', name: 'O3 Mini (2025-01-31)', model_id: 'o3-mini-2025-01-31', params: { reasoning_effort: 'medium' } },
  { id: 'o4-mini', name: 'O4 Mini', model_id: 'o4-mini', params: { reasoning_effort: 'medium' } },
  { id: 'o4-mini-2025-04-16', name: 'O4 Mini (2025-04-16)', model_id: 'o4-mini-2025-04-16', params: { reasoning_effort: 'medium' } },
  // If OpenAI releases a model with "reasoning" in the name, add it here.
];

// Model arrays removed - now using dynamic ModelSelector with real Replicate models

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

// Parameter resolution helper
export function getEffectiveModelParams(
  type: 'image' | 'video' | 'audio',
  scene: Scene,
  settings: Settings
): Record<string, unknown> {
  const globalParams = settings[`${type}_model_params` as keyof Settings] as Record<string, unknown> || {};
  const sceneOverrides = scene[`${type}_model_overrides` as keyof Scene] as Record<string, unknown> || {};
  return { ...globalParams, ...sceneOverrides };
}

// Helper to get the effective model ID for a scene
export function getEffectiveModelId(
  type: 'image' | 'video' | 'audio',
  scene: Scene,
  settings: Settings
): string {
  return scene[`selected_${type}_model` as keyof Scene] as string || 
         settings[`selected_${type}_model` as keyof Settings] as string;
}

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
    if (typeof window === 'undefined') return {};
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
  setCurrentView: (view) => {
    if (view === 'input') {
      get().resetStoryboard();
    }
    set({ currentView: view })
  },
  
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
  settings: {
    openai_api_key: '',
    replicate_api_key: '',
    general_prompt: GENERAL_PROMPT,
    mode_prompts: {},
    selected_storyboard_model: 'gpt-4o',
    selected_image_model: 'fofr/seedream-3',
    selected_video_model: 'kwaivgi/kling-v2.1',
    selected_audio_model: 'zsxkib/mmaudio-v2'
  },
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

  updateSceneModelOverrides: (sceneId, type, overrides) => set((state) => {
    if (!state.storyboardData) return state;
    
    const scenes = state.storyboardData.scenes.map(scene =>
      scene.id === sceneId ? { 
        ...scene, 
        [`${type}_model_overrides`]: overrides 
      } : scene
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
  
  // Visual scene order
  visualSceneOrder: [],
  setVisualSceneOrder: (scenes) => set({ visualSceneOrder: scenes }),
  
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
  }),
  
  // Enhanced generation state management
  sceneGenerationStates: new Map(),
  generationCancellation: new Map(),
  generateAllCancelled: false,
  
  setSceneGenerationState: (sceneId, type, generating) => set((state) => {
    const newStates = new Map(state.sceneGenerationStates);
    if (!newStates.has(sceneId)) {
      newStates.set(sceneId, new Map());
    }
    newStates.get(sceneId)!.set(type, generating);
    
    // Also update the cancellation map
    const newCancellation = new Map(state.generationCancellation);
    const key = `${sceneId}-${type}`;
    
    if (generating && !newCancellation.has(key)) {
      newCancellation.set(key, new AbortController());
    } else if (!generating && newCancellation.has(key)) {
      newCancellation.delete(key);
    }
    
    return { 
      sceneGenerationStates: newStates,
      generationCancellation: newCancellation 
    };
  }),
  
  getSceneGenerationState: (sceneId, type) => {
    const state = get();
    return state.sceneGenerationStates.get(sceneId)?.get(type) || false;
  },
  
  cancelGeneration: (sceneId, type) => {
    const state = get();
    const key = `${sceneId}-${type}`;
    const controller = state.generationCancellation.get(key);
    
    if (controller && !controller.signal.aborted) {
      controller.abort();
      
      // Immediately update the state
      set((currentState) => {
        const newStates = new Map(currentState.sceneGenerationStates);
        if (newStates.has(sceneId)) {
          newStates.get(sceneId)!.set(type, false);
        }
        
        const newCancellation = new Map(currentState.generationCancellation);
        newCancellation.delete(key);
        
        return {
          sceneGenerationStates: newStates,
          generationCancellation: newCancellation
        };
      });
    }
  },

  setGenerateAllCancelled: (cancelled) => set({ generateAllCancelled: cancelled }),

  resetStoryboard: () => set({ 
    storyboardData: null, 
    generatingScenes: new Set(),
    sceneGenerationStates: new Map(),
    generationCancellation: new Map(),
    generateAllCancelled: false
  }),

  loadInitialSettings: () => {
    const stored = loadSettingsFromStorage();
    set((state) => ({
      settings: {
        ...state.settings,
        ...stored,
        general_prompt: stored.general_prompt || GENERAL_PROMPT,
        selected_storyboard_model: stored.selected_storyboard_model || 'gpt-4o',
        selected_image_model: stored.selected_image_model || 'fofr/seedream-3',
        selected_video_model: stored.selected_video_model || 'kwaivgi/kling-v2.1',
        selected_audio_model: stored.selected_audio_model || 'zsxkib/mmaudio-v2'
      }
    }));
  },

})); 