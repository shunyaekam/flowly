import promptPresets from '@/data/prompt-presets.json';

export interface PromptPreset {
  name: string;
  description: string;
  prompt: string;
}

export type PromptPresets = Record<string, PromptPreset>;

// Load prompts from JSON file
export const TOPIC_PROMPTS: PromptPresets = promptPresets;

// Get all available prompt preset keys
export const getPromptPresetKeys = (): string[] => {
  return Object.keys(TOPIC_PROMPTS);
};

// Get a specific prompt preset
export const getPromptPreset = (key: string): PromptPreset | null => {
  return TOPIC_PROMPTS[key] || null;
};

// Get all prompt presets
export const getAllPromptPresets = (): PromptPresets => {
  return TOPIC_PROMPTS;
};

// Get prompt presets for dropdown/selection UI
export const getPromptPresetsForUI = (): Array<{key: string, name: string, description: string}> => {
  return Object.entries(TOPIC_PROMPTS).map(([key, preset]) => ({
    key,
    name: preset.name,
    description: preset.description
  }));
}; 