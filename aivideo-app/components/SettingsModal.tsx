'use client';

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useAppStore, 
  Settings, 
  storyboardModels, 
  TOPIC_PROMPTS,
  GENERAL_PROMPT,
  EXAMPLE_PROMPTS
} from '@/lib/store';
import ModelSelector from './ModelSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings, selectedMode, setSelectedMode } = useAppStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [showExamplePrompts, setShowExamplePrompts] = useState(false);
  const [currentModePrompt, setCurrentModePrompt] = useState('');
  const [modelSelectorOpen, setModelSelectorOpen] = useState<'image' | 'video' | 'audio' | null>(null);
  const [dynamicExamples, setDynamicExamples] = useState<string>('');

  // Function to fetch model examples using direct Replicate API
  const fetchModelExamples = async (modelId: string): Promise<string[]> => {
    if (!settings.replicate_api_key || !modelId) return [];
    
    try {
      // Use a server-side helper to fetch model data
      const response = await fetch('/api/model-examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          apiKey: settings.replicate_api_key
        })
      });

      if (!response.ok) return [];

      const examples = await response.json();
      
      // Format examples with prefixes for display
      return examples.map((ex: string, i: number) => `${i + 1}. "${ex}"`);
      
    } catch (error) {
      console.error('Failed to fetch model examples:', error);
      return [];
    }
  };

  // Load dynamic examples when settings change
  const loadDynamicExamples = async () => {
    if (!settings.replicate_api_key) {
      console.log('No Replicate API key, skipping dynamic examples');
      setDynamicExamples('');
      return;
    }

    console.log('Loading dynamic examples for models:', {
      image: settings.selected_image_model,
      video: settings.selected_video_model,
      audio: settings.selected_audio_model
    });

    try {
      const [imageExamples, videoExamples, audioExamples] = await Promise.all([
        settings.selected_image_model ? fetchModelExamples(settings.selected_image_model) : Promise.resolve([]),
        settings.selected_video_model ? fetchModelExamples(settings.selected_video_model) : Promise.resolve([]),
        settings.selected_audio_model ? fetchModelExamples(settings.selected_audio_model) : Promise.resolve([])
      ]);

      console.log('Fetched examples:', { imageExamples, videoExamples, audioExamples });

      let exampleText = '';
      
      if (imageExamples.length > 0) {
        exampleText += `IMAGE MODEL (${settings.selected_image_model}):\n${imageExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\n`;
      }
      
      if (videoExamples.length > 0) {
        exampleText += `VIDEO MODEL (${settings.selected_video_model}):\n${videoExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\n`;
      }
      
      if (audioExamples.length > 0) {
        exampleText += `AUDIO MODEL (${settings.selected_audio_model}):\n${audioExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}\n\n`;
      }

      if (exampleText) {
        setDynamicExamples(exampleText.trim());
        console.log('Set dynamic examples successfully');
      } else {
        setDynamicExamples('No examples found for selected models.');
        console.log('No examples found for any selected models');
      }
    } catch (error) {
      console.error('Failed to load dynamic examples:', error);
      setDynamicExamples('Failed to load model examples.');
    }
  };
  
  // Initialize mode prompt when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      // Load mode-specific prompt
      const modePrompt = settings.mode_prompts[selectedMode] || 
                        TOPIC_PROMPTS[selectedMode as keyof typeof TOPIC_PROMPTS]?.prompt || 
                        '';
      setCurrentModePrompt(modePrompt);
      // Load dynamic examples
      loadDynamicExamples();
    }
  }, [isOpen, settings, selectedMode]);

  // Reload examples when models change
  useEffect(() => {
    if (isOpen) {
      loadDynamicExamples();
    }
  }, [settings.selected_image_model, settings.selected_video_model, settings.selected_audio_model, settings.replicate_api_key]);
  
  const handleSettingChange = (key: keyof Settings, value: string) => {
    const updatedSettings = {
      ...localSettings,
      [key]: value
    };
    setLocalSettings(updatedSettings);
    // Auto-save immediately
    setSettings(updatedSettings);
  };
  
  const handleSaveGeneralPrompt = () => {
    setSettings(localSettings);
  };
  
  const handleResetGeneralPrompt = () => {
    const updatedSettings = {
      ...localSettings,
      general_prompt: GENERAL_PROMPT
    };
    setLocalSettings(updatedSettings);
    setSettings(updatedSettings);
  };
  
  const handleSaveModePrompt = () => {
    const updatedModePrompts = {
      ...localSettings.mode_prompts,
      [selectedMode]: currentModePrompt
    };
    const updatedSettings = {
      ...localSettings,
      mode_prompts: updatedModePrompts
    };
    setLocalSettings(updatedSettings);
    setSettings(updatedSettings);
  };
  
  const handleResetModePrompt = () => {
    const defaultPrompt = TOPIC_PROMPTS[selectedMode as keyof typeof TOPIC_PROMPTS]?.prompt || '';
    setCurrentModePrompt(defaultPrompt);
  };
  
  const handleModeChange = (newMode: string) => {
    // Save current mode prompt before switching
    if (currentModePrompt !== (settings.mode_prompts[selectedMode] || TOPIC_PROMPTS[selectedMode as keyof typeof TOPIC_PROMPTS]?.prompt || '')) {
      const updatedModePrompts = {
        ...localSettings.mode_prompts,
        [selectedMode]: currentModePrompt
      };
      const updatedSettings = {
        ...localSettings,
        mode_prompts: updatedModePrompts
      };
      setLocalSettings(updatedSettings);
      setSettings(updatedSettings);
    }
    
    setSelectedMode(newMode);
    
    // Load new mode prompt
    const modePrompt = settings.mode_prompts[newMode] || 
                      TOPIC_PROMPTS[newMode as keyof typeof TOPIC_PROMPTS]?.prompt || 
                      '';
    setCurrentModePrompt(modePrompt);
  };

  const handleModelSelect = (modelId: string, customParams?: Record<string, unknown>) => {
    const type = modelSelectorOpen; // Get the type from which selector is open
    if (!type) return;
    
    console.log('Settings: Selecting model', modelId, 'for', type, 'with params:', customParams);
    
    // Update both model and params together
    const settingKey = `selected_${type}_model` as keyof Settings;
    const paramsKey = `${type}_model_params` as keyof Settings;
    
    const updatedSettings = {
      ...localSettings,
      [settingKey]: modelId,
      ...(customParams && Object.keys(customParams).length > 0 ? { [paramsKey]: customParams } : {})
    };
    
    setLocalSettings(updatedSettings);
    setSettings(updatedSettings);
    setModelSelectorOpen(null);
  };

  const getSelectedModelName = (type: 'image' | 'video' | 'audio') => {
    const modelId = localSettings[`selected_${type}_model` as keyof Settings] as string;
    if (!modelId) return 'Select model...';
    
    // Show just the model name part
    return modelId.split('/').pop() || modelId;
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Don't close if ModelSelector is open
    if (modelSelectorOpen) return;
    
    // Close if clicking on the backdrop or main content area (but not on interactive elements)
    const target = e.target as HTMLElement;
    if (
      e.target === e.currentTarget || 
      target.classList.contains('backdrop-clickable') ||
      (target.tagName === 'DIV' && !target.closest('select') && !target.closest('textarea') && !target.closest('input'))
    ) {
      // Save any pending changes before closing
      if (currentModePrompt !== (settings.mode_prompts[selectedMode] || TOPIC_PROMPTS[selectedMode as keyof typeof TOPIC_PROMPTS]?.prompt || '')) {
        const updatedModePrompts = {
          ...localSettings.mode_prompts,
          [selectedMode]: currentModePrompt
        };
        setSettings({
          ...localSettings,
          mode_prompts: updatedModePrompts
        });
      }
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-lg backdrop-clickable"
      onClick={handleBackdropClick}
    >
      {/* Settings content */}
      <div className="h-full flex backdrop-clickable" onClick={handleBackdropClick}>
        {/* Left Panel - API Keys */}
        <div className="w-1/3 h-full p-8 pr-4 overflow-y-auto backdrop-clickable" onClick={handleBackdropClick}>
          <h2 className="text-2xl font-light text-white mb-6">api keys</h2>
          
          {/* API Keys */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                REPLICATE:
              </label>
              <input
                type="password"
                value={localSettings.replicate_api_key}
                onChange={(e) => handleSettingChange('replicate_api_key', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="r8_..."
                className="w-full px-2 py-2 bg-transparent border-none text-white placeholder-white/50 focus:outline-none font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                OPENAI:
              </label>
              <input
                type="password"
                value={localSettings.openai_api_key}
                onChange={(e) => handleSettingChange('openai_api_key', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="sk-..."
                className="w-full px-2 py-2 bg-transparent border-none text-white placeholder-white/50 focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Middle Panel - Models & Video Mode */}
        <div className="w-1/3 h-full p-8 px-4 overflow-y-auto backdrop-clickable" onClick={handleBackdropClick}>
          {/* Models */}
          <h2 className="text-2xl font-light text-white mb-6">models</h2>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                storyboard:
              </label>
              <select
                value={localSettings.selected_storyboard_model}
                onChange={(e) => handleSettingChange('selected_storyboard_model', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
              >
                {storyboardModels.map(model => (
                  <option key={model.id} value={model.id} className="bg-gray-800">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                image:
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModelSelectorOpen('image');
                }}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
              >
                {getSelectedModelName('image')}
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                video:
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModelSelectorOpen('video');
                }}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
              >
                {getSelectedModelName('video')}
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                audio:
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModelSelectorOpen('audio');
                }}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
              >
                {getSelectedModelName('audio')}
              </button>
            </div>
          </div>
          
          {/* Video Mode */}
          <h2 className="text-2xl font-light text-white mb-6">video mode</h2>
          <div>
            <select
              value={selectedMode}
              onChange={(e) => handleModeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
            >
              {Object.entries(TOPIC_PROMPTS).map(([key, value]) => (
                <option key={key} value={key} className="bg-gray-800">
                  {value.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Right Panel - Prompts */}
        <div className="w-1/3 h-full p-8 pl-4 overflow-y-auto">
          {/* General Prompt */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-light text-white">general prompt:</h2>
              <div className="flex gap-4">
                <button
                  onClick={handleSaveGeneralPrompt}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  save
                </button>
                <button
                  onClick={handleResetGeneralPrompt}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  reset
                </button>
              </div>
            </div>
            <textarea
              value={localSettings.general_prompt}
              onChange={(e) => handleSettingChange('general_prompt', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={6}
              className="w-full p-2 bg-transparent border-none text-white placeholder-white/50 focus:outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>
          
          {/* Mode Prompt */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-light text-white">mode prompt:</h2>
              <div className="flex gap-4">
                <button
                  onClick={handleSaveModePrompt}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  save
                </button>
                <button
                  onClick={handleResetModePrompt}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  reset
                </button>
              </div>
            </div>
            <textarea
              value={currentModePrompt}
              onChange={(e) => setCurrentModePrompt(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={6}
              className="w-full p-2 bg-transparent border-none text-white placeholder-white/50 focus:outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>
          
          {/* Example Prompts */}
          <div>
            <button
              onClick={() => setShowExamplePrompts(!showExamplePrompts)}
              className="flex items-center gap-2 text-2xl font-light text-white mb-4 hover:text-white/80 transition-colors"
            >
              example prompts {showExamplePrompts ? '(close)' : '(open)'}
              {showExamplePrompts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showExamplePrompts && (
              <div className="p-2">
                {dynamicExamples ? (
                  <div>
                    <h4 className="text-white/90 text-sm font-light mb-3">selected model examples:</h4>
                    <pre className="text-white/70 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                      {dynamicExamples}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p className="text-white/50 text-sm">Select models to see examples, or add Replicate API key to fetch dynamic examples.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Version number */}
      <div className="absolute bottom-4 right-4">
        <span className="text-white/30 text-xs font-light">v0.85</span>
      </div>

      {/* Model Selectors */}
      <ModelSelector
        isOpen={modelSelectorOpen === 'image'}
        onClose={() => setModelSelectorOpen(null)}
        type="image"
        onModelSelect={handleModelSelect}
      />
      
      <ModelSelector
        isOpen={modelSelectorOpen === 'video'}
        onClose={() => setModelSelectorOpen(null)}
        type="video"
        onModelSelect={handleModelSelect}
      />
      
      <ModelSelector
        isOpen={modelSelectorOpen === 'audio'}
        onClose={() => setModelSelectorOpen(null)}
        type="audio"
        onModelSelect={handleModelSelect}
      />
    </div>
  );
} 