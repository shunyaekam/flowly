'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import SettingsModal from '@/components/SettingsModal';
import { generateStoryboard } from '@/lib/api';
import { playSounds } from '@/lib/sounds';

export default function InputView() {
  const { 
    setCurrentView, 
    setStoryboardData, 
    selectedMode, 
    settings,
    setSettings,
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
      let storyboard;
      
      if (!settings.openai_api_key) {
        throw new Error('OpenAI API key not found in settings. Please add it to generate a storyboard.');
      } else {
        // Use real API
        storyboard = await generateStoryboard(
          prompt,
          selectedMode,
          customModes,
          settings.openai_api_key,
          settings.general_prompt,
          settings.selected_storyboard_model,
          settings.selected_image_model,
          settings.selected_video_model,
          settings.selected_audio_model,
          settings.replicate_api_key
        );
      }
      
      setStoryboardData(storyboard);
      playSounds.ok();
      setCurrentView('storyboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error generating storyboard:', error);
      playSounds.openOverlay();
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
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Top Navigation - No shadow/border */}
      <div className="bg-white z-10">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left spacer */}
          <div></div>
          
          {/* Center spacer */}
          <div></div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                playSounds.openOverlay();
                setShowSettingsModal(true);
              }}
              onMouseEnter={() => playSounds.hover()}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Logo */}
        <h1 className="text-3xl mb-20 font-serif" style={{ fontVariantEmoji: 'text' }}>&#9775;</h1>

        {/* Input */}
        <div className="w-[500px] mb-8">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyPress={handleKeyPress}
              placeholder="describe your story"
              className="w-full border-b border-black text-lg px-0 py-2 resize-none focus:outline-none overflow-hidden min-h-[40px] transition-all bg-transparent"
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
          onMouseEnter={() => (!prompt.trim() || isGenerating) ? null : playSounds.hover()}
          disabled={!prompt.trim() || isGenerating}
          className="text-sm opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {isGenerating ? 'generating...' : 'generate'}
        </button>

        {/* API Status */}
        <div className="mt-6 flex flex-col items-center gap-2">
          {!settings.openai_api_key && (
            <p className="text-xs text-gray-500">
              No OpenAI API key found in settings. Generation features will be limited.
            </p>
          )}
          
          {!settings.replicate_api_key && (
            <p className="text-xs text-gray-500">
              No Replicate API key found in settings. Generation features will be limited.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 