'use client';

import { useState, useEffect } from 'react';
import { useAppStore, imageModels, videoModels, audioModels } from '@/lib/store';
import { X, RefreshCw } from 'lucide-react';

export default function SceneViewerOverlay() {
  const { 
    editingSceneId, 
    setEditingSceneId,
    sceneViewTab,
    setSceneViewTab,
    storyboardData,
    updateScene,
    settings
  } = useAppStore();
  
  // Find the current scene being edited
  const currentScene = storyboardData?.scenes.find(s => s.id === editingSceneId);
  
  // Local state for editing
  const [scriptText, setScriptText] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [audioPrompt, setAudioPrompt] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState(settings.selected_image_model);
  const [selectedVideoModel, setSelectedVideoModel] = useState(settings.selected_video_model);
  const [selectedAudioModel, setSelectedAudioModel] = useState(settings.selected_audio_model);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Initialize local state when scene changes
  useEffect(() => {
    if (currentScene) {
      setScriptText(currentScene.scene);
      setImagePrompt(currentScene.scene_image_prompt);
      setVideoPrompt(currentScene.scene_video_prompt);
      setAudioPrompt(currentScene.scene_sound_prompt);
    }
  }, [currentScene]);
  
  // Handle closing the overlay
  const handleClose = () => {
    // Save any pending changes
    if (currentScene) {
      updateScene(currentScene.id, {
        scene: scriptText,
        scene_image_prompt: imagePrompt,
        scene_video_prompt: videoPrompt,
        scene_sound_prompt: audioPrompt
      });
    }
    setEditingSceneId(null);
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Don't render if no scene is being edited
  if (!editingSceneId || !currentScene) return null;
  
  // Handle generate/regenerate
  const handleGenerate = async (type: 'image' | 'video' | 'audio') => {
    setIsGenerating(true);
    
    // Save prompts before generating
    updateScene(currentScene.id, {
      scene: scriptText,
      scene_image_prompt: imagePrompt,
      scene_video_prompt: videoPrompt,
      scene_sound_prompt: audioPrompt
    });
    
    try {
      // TODO: Implement API calls for generation
      console.log(`Generating ${type} for scene ${currentScene.id}`);
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, just log the action
      alert(`${type} generation will be implemented with API integration`);
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Render content based on selected tab
  const renderLeftContent = () => {
    switch (sceneViewTab) {
      case 'script':
        // Dynamic font size based on text length - much more aggressive scaling
        const getScriptFontSize = () => {
          const textLength = scriptText.length;
          if (textLength < 25) return 'clamp(4rem, 8vw, 8rem)';
          if (textLength < 50) return 'clamp(3rem, 6vw, 6rem)';
          if (textLength < 100) return 'clamp(2rem, 4vw, 4rem)';
          if (textLength < 200) return 'clamp(1.5rem, 3vw, 3rem)';
          if (textLength < 300) return 'clamp(1.2rem, 2.5vw, 2.5rem)';
          if (textLength < 500) return 'clamp(1rem, 2vw, 2rem)';
          if (textLength < 750) return 'clamp(0.9rem, 1.8vw, 1.8rem)';
          if (textLength < 1000) return 'clamp(0.8rem, 1.6vw, 1.6rem)';
          if (textLength < 1500) return 'clamp(0.7rem, 1.4vw, 1.4rem)';
          if (textLength < 2000) return 'clamp(0.6rem, 1.2vw, 1.2rem)';
          return 'clamp(0.5rem, 1vw, 1rem)';
        };
        
        return (
          <div className="h-full flex items-center justify-center p-8 backdrop-clickable" onClick={handleBackdropClick}>
            <div className="w-full h-full max-w-6xl flex items-center justify-center backdrop-clickable" onClick={handleBackdropClick}>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full text-white bg-transparent resize-none focus:outline-none leading-relaxed font-light text-center placeholder-white/50"
                placeholder="Enter your scene script here..."
                style={{ fontSize: getScriptFontSize() }}
              />
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="h-full flex items-center justify-center p-12">
            {currentScene.generated_image ? (
              <img 
                src={currentScene.generated_image} 
                alt="Generated scene"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-white/70 text-lg font-light">No image yet...</p>
              </div>
            )}
          </div>
        );
        
      case 'video':
        return (
          <div className="h-full flex items-center justify-center p-12">
            {currentScene.generated_video ? (
              <video 
                src={currentScene.generated_video} 
                controls
                className="max-w-full max-h-full rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-white/70 text-lg font-light">No video yet...</p>
              </div>
            )}
          </div>
        );
        
      case 'audio':
        return (
          <div className="h-full flex items-center justify-center p-12">
            {currentScene.generated_sound ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8">
                <audio 
                  src={currentScene.generated_sound} 
                  controls
                  className="w-96"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-white/70 text-lg font-light">No audio yet...</p>
              </div>
            )}
          </div>
        );
    }
  };
  
  // Render controls based on selected tab
  const renderRightContent = () => {
    switch (sceneViewTab) {
      case 'script':
        return null; // No right panel for script editor
        
      case 'image':
        return (
          <div className="h-full p-12 overflow-y-auto">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-light text-white mb-4">image prompt:</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Describe the visual scene in detail. Include camera angles, lighting, 
                  colors, and atmosphere. Be specific and cinematic.
                </p>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={8}
                  className="w-full p-4 bg-transparent border-none text-white placeholder-white/50 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                  placeholder="Describe the image..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-light text-white/80 mb-2">model:</label>
                <select
                  value={selectedImageModel}
                  onChange={(e) => setSelectedImageModel(e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
                >
                  {imageModels.map(model => (
                    <option key={model.id} value={model.id} className="bg-gray-800">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleGenerate('image')}
                disabled={isGenerating}
                className="w-full py-3 text-white hover:text-white/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : currentScene.generated_image ? (
                  're-generate'
                ) : (
                  'generate'
                )}
              </button>
            </div>
          </div>
        );
        
      case 'video':
        return (
          <div className="h-full p-12 overflow-y-auto">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-light text-white mb-4">video prompt:</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Describe camera movements, transitions, and motion. 
                  Specify duration and pacing for the video generation.
                </p>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={8}
                  className="w-full p-4 bg-transparent border-none text-white placeholder-white/50 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                  placeholder="Describe the video motion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-light text-white/80 mb-2">model:</label>
                <select
                  value={selectedVideoModel}
                  onChange={(e) => setSelectedVideoModel(e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
                >
                  {videoModels.map(model => (
                    <option key={model.id} value={model.id} className="bg-gray-800">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleGenerate('video')}
                disabled={isGenerating}
                className="w-full py-3 text-white hover:text-white/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : currentScene.generated_video ? (
                  're-generate'
                ) : (
                  'generate'
                )}
              </button>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="h-full p-12 overflow-y-auto">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-light text-white mb-4">audio prompt:</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Describe the ambient sounds, music style, and audio atmosphere. 
                  Include tempo, mood, and specific sound effects.
                </p>
                <textarea
                  value={audioPrompt}
                  onChange={(e) => setAudioPrompt(e.target.value)}
                  rows={8}
                  className="w-full p-4 bg-transparent border-none text-white placeholder-white/50 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                  placeholder="Describe the audio/sound..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-light text-white/80 mb-2">model:</label>
                <select
                  value={selectedAudioModel}
                  onChange={(e) => setSelectedAudioModel(e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none appearance-none cursor-pointer text-sm"
                >
                  {audioModels.map(model => (
                    <option key={model.id} value={model.id} className="bg-gray-800">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleGenerate('audio')}
                disabled={isGenerating}
                className="w-full py-3 text-white hover:text-white/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : currentScene.generated_sound ? (
                  're-generate'
                ) : (
                  'generate'
                )}
              </button>
            </div>
          </div>
        );
    }
  };
  
  const rightContent = renderRightContent();
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close if clicking on the backdrop or main content area (but not on interactive elements)
    const target = e.target as HTMLElement;
    if (
      e.target === e.currentTarget || 
      target.classList.contains('backdrop-clickable') ||
      target.tagName === 'DIV'
    ) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-lg backdrop-clickable" 
      onClick={handleBackdropClick}
    >
      {/* Floating Tab Navigation */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center rounded-full p-1">
          {(['script', 'image', 'video', 'audio'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSceneViewTab(tab)}
              className={`px-6 py-2 text-sm font-medium capitalize rounded-full transition-colors ${
                sceneViewTab === tab 
                  ? 'text-white' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="h-full flex pt-20 backdrop-clickable" onClick={handleBackdropClick}>
        {/* Left Panel - Scene Content */}
        <div className={`${rightContent ? 'w-1/2' : 'w-full'} h-full backdrop-clickable`} onClick={handleBackdropClick}>
          {renderLeftContent()}
        </div>
        
        {/* Right Panel - Controls (only if content exists) */}
        {rightContent && (
          <div className="w-1/2 h-full">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
} 