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
  created_at: string;
}

export interface ModelOption {
  id: string;
  name: string;
  model_id: string;
  params: Record<string, string | number | boolean>;
}

export interface Mode {
  id: string;
  name: string;
  prompt_template: string;
}

export interface AppSettings {
  openai_api_key: string;
  replicate_api_token: string;
  selected_storyboard_model: string;
  selected_image_model: string;
  selected_video_model: string;
  selected_sound_model: string;
  default_mode: string;
  general_prompt: string;
  save_directory: string;
}

export type ViewType = 'input' | 'storyboard';
export type GenerationStep = 'images' | 'videos' | 'sounds';
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'; 