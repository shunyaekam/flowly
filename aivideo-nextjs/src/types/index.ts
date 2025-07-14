export interface Scene {
  id: string;
  scene_text: string;
  scene_image_prompt: string;
  scene_video_prompt: string;
  scene_sound_prompt: string;
  image_generated: boolean;
  video_generated: boolean;
  sound_generated: boolean;
  image_url?: string;
  video_url?: string;
  final_video_url?: string;
  is_generating_image?: boolean;
  is_generating_video?: boolean;
  is_generating_sound?: boolean;
}

export interface StoryboardData {
  scenes: Scene[];
  original_prompt: string;
  mode: string;
  model: string;
  created_at: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  // Replicate model configurations
  image_model: string;
  video_model: string;
  sound_model: string;
  image_params: Record<string, string | number | boolean>;
  video_params: Record<string, string | number | boolean>;
  sound_params: Record<string, string | number | boolean>;
}

export interface Mode {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
}

export interface AppSettings {
  openai_api_key: string;
  replicate_api_token: string;
  default_model: string;
  default_mode: string;
  general_prompt: string;
  save_directory: string;
}

export type ViewType = 'input' | 'storyboard';
export type GenerationStep = 'images' | 'videos' | 'sounds';
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'; 