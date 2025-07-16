'use client';

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useAppStore, 
  Settings, 
  storyboardModels, 
  imageModels,
  videoModels,
  audioModels,
  TOPIC_PROMPTS,
  GENERAL_PROMPT,
  EXAMPLE_PROMPTS
} from '@/lib/store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings, selectedMode, setSelectedMode } = useAppStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [showExamplePrompts, setShowExamplePrompts] = useState(false);
  const [currentModePrompt, setCurrentModePrompt] = useState('');
  
  // Initialize mode prompt when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      // Load mode-specific prompt
      const modePrompt = settings.mode_prompts[selectedMode] || 
                        TOPIC_PROMPTS[selectedMode as keyof typeof TOPIC_PROMPTS]?.prompt || 
                        '';
      setCurrentModePrompt(modePrompt);
    }
  }, [isOpen, settings, selectedMode]);
  
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
  
  const handleBackdropClick = (e: React.MouseEvent) => {
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
              <select
                value={localSettings.selected_image_model}
                onChange={(e) => handleSettingChange('selected_image_model', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
              >
                {imageModels.map(model => (
                  <option key={model.id} value={model.id} className="bg-gray-800">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                video:
              </label>
              <select
                value={localSettings.selected_video_model}
                onChange={(e) => handleSettingChange('selected_video_model', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
              >
                {videoModels.map(model => (
                  <option key={model.id} value={model.id} className="bg-gray-800">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-light text-white/80 mb-2">
                audio:
              </label>
              <select
                value={localSettings.selected_audio_model}
                onChange={(e) => handleSettingChange('selected_audio_model', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
              >
                {audioModels.map(model => (
                  <option key={model.id} value={model.id} className="bg-gray-800">
                    {model.name}
                  </option>
                ))}
              </select>
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
                <pre className="text-white/70 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {EXAMPLE_PROMPTS}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 