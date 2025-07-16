'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore, storyboardModels } from '@/lib/store';
import { SimpleSettingsModal } from '@/features/settings/SimpleSettingsModal';

export default function InputView() {
  const { 
    setCurrentView, 
    setStoryboardData, 
    selectedMode, 
    settings,
    setSettings,
    setSelectedMode,
    customModes
  } = useAppStore();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Validate API key
      if (!settings.openai_api_key) {
        throw new Error('OpenAI API key is required. Please add it in settings.');
      }
      
      const storyboardModel = storyboardModels.find(m => m.id === settings.selected_storyboard_model) || storyboardModels[0];
      
      const response = await fetch('/api/generate/storyboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: selectedMode,
          model: storyboardModel.model_id,
          params: storyboardModel.params,
          openai_api_key: settings.openai_api_key,
          general_prompt: settings.general_prompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const storyboardData = await response.json();
      setStoryboardData(storyboardData);
      setCurrentView('storyboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error generating storyboard:', error);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-end px-8 py-4">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="text-sm cursor-pointer hover:opacity-70 transition-opacity"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SimpleSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSettingsChange={setSettings}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        customModes={customModes}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-20">
        {/* Logo */}
        <h1 className="text-3xl mb-20">☯</h1>

        {/* Input */}
        <div className="w-[500px] mb-8">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyPress={handleKeyPress}
              placeholder="describe your video"
              className="w-full border-b border-black text-lg px-0 py-2 resize-none focus:outline-none overflow-hidden min-h-[40px] transition-all"
              rows={1}
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="text-sm opacity-50 hover:opacity-100 transition-opacity"
        >
          {isGenerating ? 'generating...' : 'generate'}
        </button>
      </div>
    </div>
  );
} 