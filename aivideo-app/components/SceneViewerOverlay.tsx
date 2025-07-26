'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateImage, generateVideo, generateAudio, pollForPrediction } from '@/lib/api';
import { playSounds } from '@/lib/sounds';
import ModelSelector from './ModelSelector';

export default function SceneViewerOverlay() {
  const { 
    editingSceneId, 
    setEditingSceneId,
    sceneViewTab,
    setSceneViewTab,
    storyboardData,
    updateScene,
    settings,
    setSceneGenerationState,
    getSceneGenerationState,
    cancelGeneration,
    generationCancellation,
    visualSceneOrder,
    availableModels,
    modelsLoading,
    loadAvailableModels
  } = useAppStore();
  
  // Find the current scene being edited
  const currentScene = storyboardData?.scenes.find(s => s.id === editingSceneId);
  
  // Use visual scene order for navigation
  const currentSceneIndex = visualSceneOrder.findIndex(s => s.id === editingSceneId) ?? -1;
  const totalScenes = visualSceneOrder.length;
  
  // Local state for editing
  const [scriptText, setScriptText] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [audioPrompt, setAudioPrompt] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState(settings.selected_image_model);
  const [selectedVideoModel, setSelectedVideoModel] = useState(settings.selected_video_model);
  const [selectedAudioModel, setSelectedAudioModel] = useState(settings.selected_audio_model);
  const [showCancelDialog, setShowCancelDialog] = useState<'image' | 'video' | 'audio' | null>(null);
  const [activePredictions, setActivePredictions] = useState<Map<string, string>>(new Map()); // Map scene-type to prediction ID
  const [modelSelectorOpen, setModelSelectorOpen] = useState<'image' | 'video' | 'audio' | null>(null);
  
  // Initialize local state when scene changes
  useEffect(() => {
    if (currentScene) {
      setScriptText(currentScene.scene);
      setImagePrompt(currentScene.scene_image_prompt);
      setVideoPrompt(currentScene.scene_video_prompt);
      setAudioPrompt(currentScene.scene_sound_prompt);
      
      // Set scene-specific models or fall back to global settings
      setSelectedImageModel(currentScene.selected_image_model || settings.selected_image_model);
      setSelectedVideoModel(currentScene.selected_video_model || settings.selected_video_model);
      setSelectedAudioModel(currentScene.selected_audio_model || settings.selected_audio_model);
    }
  }, [currentScene, settings.selected_image_model, settings.selected_video_model, settings.selected_audio_model]);

  // Load available models when component mounts
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);
  
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
    playSounds.cancel(); // Cancel sound when closing overlay
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

  // Model selection handlers
  const handleModelSelect = (modelId: string, customParams?: Record<string, any>) => {
    const type = modelSelectorOpen; // Get the type from which selector is open
    if (!type) return;
    
    console.log('Scene: Selecting model', modelId, 'for', type, 'with params:', customParams);
    
    // Update local state
    switch (type) {
      case 'image':
        setSelectedImageModel(modelId);
        break;
      case 'video':
        setSelectedVideoModel(modelId);
        break;
      case 'audio':
        setSelectedAudioModel(modelId);
        break;
    }
    
    // Save to scene data immediately
    if (currentScene) {
      const sceneUpdateKey = `selected_${type}_model` as keyof Scene;
      const paramsUpdateKey = `${type}_model_params` as keyof Scene;
      updateScene(currentScene.id, {
        [sceneUpdateKey]: modelId,
        ...(customParams && Object.keys(customParams).length > 0 ? { [paramsUpdateKey]: customParams } : {})
      });
    }
    
    setModelSelectorOpen(null);
  };

  const getSelectedModelName = (type: 'image' | 'video' | 'audio') => {
    let modelId: string;
    let isSceneSpecific = false;
    
    switch (type) {
      case 'image':
        modelId = selectedImageModel;
        isSceneSpecific = !!currentScene?.selected_image_model;
        break;
      case 'video':
        modelId = selectedVideoModel;
        isSceneSpecific = !!currentScene?.selected_video_model;
        break;
      case 'audio':
        modelId = selectedAudioModel;
        isSceneSpecific = !!currentScene?.selected_audio_model;
        break;
    }
    
    if (!modelId) return 'Select model...';
    
    // Try to find in available models first
    const model = availableModels[type]?.find(m => m.id === modelId);
    if (model) {
      const displayName = `${model.displayName} (${model.metadata.runCount.toLocaleString()} runs)`;
      return isSceneSpecific ? `${displayName} *` : displayName; // * indicates scene-specific
    }
    
    // Fallback to showing the ID
    const fallbackName = modelId.split('/').pop() || modelId;
    return isSceneSpecific ? `${fallbackName} *` : fallbackName;
  };
  
  // Navigation functions
  const navigateToScene = (direction: 'prev' | 'next') => {
    if (!visualSceneOrder.length) return;
    
    const newIndex = direction === 'prev' ? currentSceneIndex - 1 : currentSceneIndex + 1;
    if (newIndex >= 0 && newIndex < totalScenes) {
      // Save current scene changes before navigating
      if (currentScene) {
        updateScene(currentScene.id, {
          scene: scriptText,
          scene_image_prompt: imagePrompt,
          scene_video_prompt: videoPrompt,
          scene_sound_prompt: audioPrompt
        });
      }
      
      const newScene = visualSceneOrder[newIndex];
      setEditingSceneId(newScene.id);
      playSounds.option();
    }
  };
  
  // Don't render if no scene is being edited
  if (!editingSceneId || !currentScene) return null;
  
  // Handle cancellation
  const handleCancelGeneration = async (type: 'image' | 'video' | 'audio') => {
    if (currentScene) {
      const key = `${currentScene.id}-${type}`;
      const predictionId = activePredictions.get(key);
      
      // Cancel the Replicate prediction if it exists
      if (predictionId && settings.replicate_api_key) {
        try {
          const response = await fetch(`/api/predictions/${predictionId}/cancel`, {
            method: 'POST',
            headers: {
              'x-replicate-api-key': settings.replicate_api_key,
            },
          });
          
          if (!response.ok) {
            // Log but don't show error to user - cancellation UI feedback is more important
            console.log('Replicate cancellation response:', response.status);
          }
        } catch (error) {
          // Log but don't show error to user - cancellation UI feedback is more important
          console.log('Cancellation request note:', error);
        }
      }
      
      // Remove from active predictions
      setActivePredictions(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      
      cancelGeneration(currentScene.id, type);
      playSounds.cancel();
      setShowCancelDialog(null);
    }
  };

  // Handle generate/regenerate
  const handleGenerate = async (type: 'image' | 'video' | 'audio') => {
    if (!currentScene) return;
    
    // If already generating, show cancel dialog
    if (getSceneGenerationState(currentScene.id, type)) {
      setShowCancelDialog(type);
      return;
    }
    
    setSceneGenerationState(currentScene.id, type, true);
    
    // Save prompts before generating
    updateScene(currentScene.id, {
      scene: scriptText,
      scene_image_prompt: imagePrompt,
      scene_video_prompt: videoPrompt,
      scene_sound_prompt: audioPrompt
    });
    
    try {
      // Get the abort controller for this generation
      const key = `${currentScene.id}-${type}`;
      const controller = generationCancellation.get(key);
      const signal = controller?.signal;
      
      type Prediction = {
        id: string;
      };
      let prediction: Prediction;
      let result: string | null = null;
      
      switch (type) {
        case 'image':
          if (!settings.replicate_api_key) {
            throw new Error('Please add your Replicate API key in settings');
          }
          // Get custom parameters for the image model
          const imageParams = currentScene.image_model_params || settings.image_model_params || {};
          prediction = await generateImage(imagePrompt, settings.replicate_api_key, selectedImageModel, signal, imageParams);
          
          // Track the prediction ID
          setActivePredictions(prev => {
            const newMap = new Map(prev);
            newMap.set(key, prediction.id);
            return newMap;
          });
          
          result = await pollForPrediction(prediction.id, settings.replicate_api_key, signal);
          if (result) {
            updateScene(currentScene.id, {
              generated_image: result,
              image_generated: true
            });
            playSounds.ok(); // Success sound
          }
          break;
          
        case 'video':
          if (!settings.replicate_api_key) {
            throw new Error('Please add your Replicate API key in settings');
          }
          if (!currentScene.generated_image) {
            throw new Error('Please generate an image first');
          }
          // Get custom parameters for the video model
          const videoParams = currentScene.video_model_params || settings.video_model_params || {};
          prediction = await generateVideo(videoPrompt, currentScene.generated_image, settings.replicate_api_key, selectedVideoModel, signal, videoParams);
          
          // Track the prediction ID
          setActivePredictions(prev => {
            const newMap = new Map(prev);
            newMap.set(key, prediction.id);
            return newMap;
          });
          
          result = await pollForPrediction(prediction.id, settings.replicate_api_key, signal);
          if (result) {
            updateScene(currentScene.id, {
              generated_video: result,
              video_generated: true
            });
            playSounds.ok(); // Success sound
          }
          break;
          
        case 'audio':
          if (!settings.replicate_api_key) {
            throw new Error('Please add your Replicate API key in settings');
          }
          if (!currentScene.generated_video) {
            throw new Error('Please generate a video first');
          }
          // Get custom parameters for the audio model
          const audioParams = currentScene.audio_model_params || settings.audio_model_params || {};
          prediction = await generateAudio(currentScene.generated_video, audioPrompt, settings.replicate_api_key, selectedAudioModel, signal, audioParams);
          
          // Track the prediction ID
          setActivePredictions(prev => {
            const newMap = new Map(prev);
            newMap.set(key, prediction.id);
            return newMap;
          });
          
          result = await pollForPrediction(prediction.id, settings.replicate_api_key, signal);
          if (result) {
            updateScene(currentScene.id, {
              generated_sound: result,
              sound_generated: true
            });
            playSounds.ok(); // Success sound
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);
      if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('aborted'))) {
        // Don't show error dialog for user-initiated cancellations
        playSounds.cancel();
      } else {
        playSounds.openOverlay(); // System NG for errors
        alert(error instanceof Error ? error.message : `Failed to generate ${type}`);
      }
    } finally {
      setSceneGenerationState(currentScene.id, type, false);
      // Clean up prediction tracking
      const key = `${currentScene.id}-${type}`;
      setActivePredictions(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
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
                <button
                  onClick={() => setModelSelectorOpen('image')}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
                >
                  {getSelectedModelName('image')}
                </button>
              </div>
              
              <button
                onClick={() => handleGenerate('image')}
                onMouseEnter={() => !getSceneGenerationState(currentScene.id, 'image') && playSounds.hover()}
                className="w-full py-3 text-white hover:text-white/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {getSceneGenerationState(currentScene.id, 'image') ? (
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
                <button
                  onClick={() => setModelSelectorOpen('video')}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
                >
                  {getSelectedModelName('video')}
                </button>
              </div>
              
              <button
                onClick={() => handleGenerate('video')}
                onMouseEnter={() => !getSceneGenerationState(currentScene.id, 'video') && playSounds.hover()}
                className="w-full py-3 text-white hover:text-white/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {getSceneGenerationState(currentScene.id, 'video') ? (
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
                <button
                  onClick={() => setModelSelectorOpen('audio')}
                  className="w-full px-0 py-2 bg-transparent border-none text-white focus:outline-none cursor-pointer text-sm text-left hover:text-white/80 transition-colors"
                >
                  {getSelectedModelName('audio')}
                </button>
              </div>
              
              <button
                onClick={() => handleGenerate('audio')}
                onMouseEnter={() => !getSceneGenerationState(currentScene.id, 'audio') && playSounds.hover()}
                className="w-full py-3 text-white hover:text-white/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {getSceneGenerationState(currentScene.id, 'audio') ? (
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
    // Don't close if ModelSelector is open
    if (modelSelectorOpen) return;
    
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
              onClick={() => {
                playSounds.option();
                setSceneViewTab(tab);
              }}
              onMouseEnter={() => playSounds.hover()}
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
      

      {/* Scene Navigation Arrows - positioned at top of entire overlay */}
      {currentSceneIndex > 0 && (
        <button
          onClick={() => navigateToScene('prev')}
          onMouseEnter={() => playSounds.hover()}
          className="absolute left-4 top-4 z-40 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-12 h-12" strokeWidth={1} />
        </button>
      )}
      
      {currentSceneIndex < totalScenes - 1 && (
        <button
          onClick={() => navigateToScene('next')}
          onMouseEnter={() => playSounds.hover()}
          className="absolute right-4 top-4 z-40 text-white/80 hover:text-white transition-colors"
        >
          <ChevronRight className="w-12 h-12" strokeWidth={1} />
        </button>
      )}

      {/* Main Content */}
      <div className="h-full flex pt-20 backdrop-clickable" onClick={handleBackdropClick}>
        {/* Left Panel - Scene Content */}
        <div className={`${rightContent ? 'w-1/2' : 'w-full'} h-full backdrop-clickable relative`} onClick={handleBackdropClick}>
          {renderLeftContent()}
        </div>
        
        {/* Right Panel - Controls (only if content exists) */}
        {rightContent && (
          <div className="w-1/2 h-full">
            {rightContent}
          </div>
        )}
      </div>
      
      {/* Cancellation Dialog */}
      {showCancelDialog && (
        <div 
          className="fixed inset-0 z-60 bg-black/40 backdrop-blur-lg backdrop-clickable flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('backdrop-clickable')) {
              setShowCancelDialog(null);
            }
          }}
        >
          <div className="backdrop-clickable p-6 max-w-md mx-4">
            <h3 className="text-2xl font-light text-white mb-6">
              stop generating {showCancelDialog}?
            </h3>
            <p className="text-white/70 mb-8 leading-relaxed">
              this will cancel the current {showCancelDialog} generation for this scene.
            </p>
            <div className="flex gap-6 justify-end">
              <button
                onClick={() => setShowCancelDialog(null)}
                onMouseEnter={() => playSounds.hover()}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                continue generating
              </button>
              <button
                onClick={() => handleCancelGeneration(showCancelDialog)}
                onMouseEnter={() => playSounds.hover()}
                className="text-sm text-white hover:text-white/80 transition-colors"
              >
                stop generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Selectors */}
      <ModelSelector
        isOpen={modelSelectorOpen === 'image'}
        onClose={() => setModelSelectorOpen(null)}
        type="image"
        sceneId={editingSceneId || undefined}
        onModelSelect={handleModelSelect}
      />
      
      <ModelSelector
        isOpen={modelSelectorOpen === 'video'}
        onClose={() => setModelSelectorOpen(null)}
        type="video"
        sceneId={editingSceneId || undefined}
        onModelSelect={handleModelSelect}
      />
      
      <ModelSelector
        isOpen={modelSelectorOpen === 'audio'}
        onClose={() => setModelSelectorOpen(null)}
        type="audio"
        sceneId={editingSceneId || undefined}
        onModelSelect={handleModelSelect}
      />
    </div>
  );
} 