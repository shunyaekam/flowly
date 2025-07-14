'use client';

import { useState } from 'react';
import { useAppStore, storyboardModels, defaultModes } from '@/lib/store';
import { Settings } from 'lucide-react';

export default function InputView() {
  const { 
    setCurrentView, 
    setStoryboardData, 
    selectedMode, 
    setSelectedMode,
    setShowSettings,
    settings
  } = useAppStore();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
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
        throw new Error('Failed to generate storyboard');
      }

      const storyboardData = await response.json();
      setStoryboardData(storyboardData);
      setCurrentView('storyboard');
    } catch (error) {
      console.error('Error generating storyboard:', error);
      alert('Error generating storyboard. Please check your API key and try again.');
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Settings Icon - Top Right */}
      <div className="absolute top-8 right-8">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-900 tracking-wide">flowly</h1>
        </div>

        {/* Input */}
        <div className="mb-8">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="describe your video"
            className="w-full px-0 py-4 text-lg border-none outline-none resize-none bg-transparent placeholder-gray-400 text-gray-900 font-light"
            rows={3}
            disabled={isGenerating}
          />
          <div className="h-px bg-gray-200 mb-8"></div>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center space-x-8 mb-16">
          {defaultModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode)}
              className={`text-sm font-light transition-colors ${
                selectedMode.id === mode.id 
                  ? 'text-gray-900' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              disabled={isGenerating}
            >
              {mode.name}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={`px-8 py-3 text-sm font-light transition-all duration-200 ${
              !prompt.trim() || isGenerating
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-900 hover:text-gray-600'
            }`}
          >
            {isGenerating ? 'generating...' : 'generate'}
          </button>
        </div>
      </div>
    </div>
  );
} 