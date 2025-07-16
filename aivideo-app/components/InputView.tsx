'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import SettingsModal from '@/components/SettingsModal';

export default function InputView() {
  const { 
    setCurrentView, 
    setStoryboardData, 
    selectedMode, 
    settings,
    setSettings
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
      // Create demo storyboard with better positioned scenes
      const demoStoryboard = {
        scenes: [
          {
            id: 'scene-1',
            scene: "Did you know that this mysterious phenomenon has baffled scientists for decades?",
            scene_image_prompt: "A cinematic, photorealistic wide shot of a mysterious scientific laboratory at twilight, with glowing equipment and shadowy figures. Dramatic lighting, desaturated colors, film grain.",
            scene_video_prompt: "Slow zoom into the laboratory, subtle camera movement",
            scene_sound_prompt: "Generate mysterious ambient sounds with electronic hums and distant echoes",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          },
          {
            id: 'scene-2',
            scene: "The evidence was right there all along, hidden in plain sight.",
            scene_image_prompt: "A cinematic close-up of ancient documents and artifacts on a dark wooden table, lit by candlelight. High contrast, shallow depth of field.",
            scene_video_prompt: "Camera slowly pans across the documents",
            scene_sound_prompt: "Generate paper rustling sounds with subtle ambient tension",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          },
          {
            id: 'scene-3',
            scene: "What they discovered would change everything we thought we knew.",
            scene_image_prompt: "A cinematic medium shot of a researcher's silhouette against a wall of data and screens. Blue-tinted lighting, noir atmosphere.",
            scene_video_prompt: "Static shot with flickering screen reflections",
            scene_sound_prompt: "Generate technological ambience with data processing sounds",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          },
          {
            id: 'scene-4',
            scene: "But the truth was more incredible than anyone could have imagined.",
            scene_image_prompt: "A cinematic wide shot of a vast underground facility with strange geometric structures. Mysterious blue lighting, high detail.",
            scene_video_prompt: "Slow reveal of the facility through camera movement",
            scene_sound_prompt: "Generate deep, resonant ambient sounds with subtle mechanical hums",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          },
          {
            id: 'scene-5',
            scene: "The implications of this discovery reach far beyond what we thought possible.",
            scene_image_prompt: "A cinematic close-up of hands holding a glowing, otherworldly artifact. Dramatic lighting, ethereal atmosphere.",
            scene_video_prompt: "Gentle rotation of the artifact in hands",
            scene_sound_prompt: "Generate ethereal, otherworldly tones with subtle energy crackling",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          },
          {
            id: 'scene-6',
            scene: "And this is just the beginning of what we're about to uncover.",
            scene_image_prompt: "A cinematic medium shot of a figure walking toward a bright portal or doorway. Silhouetted against intense light, mysterious atmosphere.",
            scene_video_prompt: "Figure slowly approaches the light source",
            scene_sound_prompt: "Generate building anticipation with rising ambient tones and distant whispers",
            image_generated: false,
            video_generated: false,
            sound_generated: false
          }
        ],
        originalPrompt: prompt,
        formatType: selectedMode
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStoryboardData(demoStoryboard);
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
              onClick={() => setShowSettingsModal(true)}
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
          disabled={!prompt.trim() || isGenerating}
          className="text-sm opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {isGenerating ? 'generating...' : 'generate'}
        </button>
      </div>
    </div>
  );
} 