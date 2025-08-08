'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, Scene, getEffectiveModelParams } from '@/lib/store';
import { RefreshCw, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { generateImage, generateVideo, generateAudio, pollForPrediction, uploadAndCacheFile, cacheGeneratedContent } from '@/lib/api';
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
    updateSceneCustomContent,
    updateSceneCache,
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
  
  // Upload functionality state
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  
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
  const handleModelSelect = (modelId: string, customParams?: Record<string, unknown>) => {
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
    
    // Save to scene data immediately using new override system
    if (currentScene) {
      const sceneUpdateKey = `selected_${type}_model` as keyof Scene;
      const overridesUpdateKey = `${type}_model_overrides` as keyof Scene;
      updateScene(currentScene.id, {
        [sceneUpdateKey]: modelId,
        ...(customParams && Object.keys(customParams).length > 0 ? { [overridesUpdateKey]: customParams } : {})
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
    
    // Show just the model name part
    const displayName = modelId.split('/').pop() || modelId;
    return isSceneSpecific ? `${displayName} *` : displayName; // * indicates scene-specific
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

  // Define effective URLs at component level for reuse
  const effectiveImageUrl = currentScene.custom_image_uploaded && currentScene.custom_image_url 
    ? currentScene.custom_image_url 
    : currentScene.generated_image;
    
  const effectiveVideoUrl = currentScene.custom_video_uploaded && currentScene.custom_video_url 
    ? currentScene.custom_video_url 
    : currentScene.generated_video;
  
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
          // Get custom parameters for the image model using new helper
          const imageParams = getEffectiveModelParams('image', currentScene, settings);
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
            
            // Automatically cache the generated content
            await cacheGeneratedContent(result, currentScene.id, 'image', updateSceneCache);
            
            playSounds.ok(); // Success sound
          }
          break;
          
        case 'video':
          if (!settings.replicate_api_key) {
            throw new Error('Please add your Replicate API key in settings');
          }
          
          // For generation, use the Replicate proxy URL, not the data URL
          const imageUrl = currentScene.custom_image_uploaded && currentScene.custom_image_replicate_url
            ? currentScene.custom_image_replicate_url 
            : currentScene.generated_image;
            
          if (!imageUrl) {
            throw new Error('Please generate or upload an image first');
          }
          
          // Get custom parameters for the video model using new helper
          const videoParams = getEffectiveModelParams('video', currentScene, settings);
          prediction = await generateVideo(videoPrompt, imageUrl, settings.replicate_api_key, selectedVideoModel, signal, videoParams);
          
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
            
            // Automatically cache the generated content
            await cacheGeneratedContent(result, currentScene.id, 'video', updateSceneCache);
            
            playSounds.ok(); // Success sound
          }
          break;
          
        case 'audio':
          if (!settings.replicate_api_key) {
            throw new Error('Please add your Replicate API key in settings');
          }
          
          // For generation, use the Replicate proxy URL, not the data URL
          const videoUrl = currentScene.custom_video_uploaded && currentScene.custom_video_replicate_url
            ? currentScene.custom_video_replicate_url 
            : currentScene.generated_video;
            
          if (!videoUrl) {
            throw new Error('Please generate or upload a video first');
          }
          
          // Get custom parameters for the audio model using new helper
          const audioParams = getEffectiveModelParams('audio', currentScene, settings);
          prediction = await generateAudio(videoUrl, audioPrompt, settings.replicate_api_key, selectedAudioModel, signal, audioParams);
          
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
            
            // Automatically cache the generated content
            await cacheGeneratedContent(result, currentScene.id, 'sound', updateSceneCache);
            
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

  // Handle file upload
  const handleUpload = async (type: 'image' | 'video') => {
    if (!currentScene || !settings.replicate_api_key) {
      alert('Please add your Replicate API key in settings');
      return;
    }

    const fileRef = type === 'image' ? imageFileRef : videoFileRef;
    const file = fileRef.current?.files?.[0];
    
    if (!file) {
      return;
    }

    setUploading(type);
    setUploadProgress('Uploading to Replicate...');

    try {
      await uploadAndCacheFile(
        file,
        currentScene.id,
        type,
        settings.replicate_api_key,
        updateSceneCustomContent
      );

      // Update scene flags
      updateScene(currentScene.id, {
        [`${type}_generated`]: true,
        [`${type}_source`]: 'uploaded'
      });

      setUploadProgress('Upload complete!');
      playSounds.ok();
      
      // Clear the file input
      if (fileRef.current) {
        fileRef.current.value = '';
      }

    } catch (error) {
      console.error(`${type} upload failed:`, error);
      setUploadProgress('Upload failed');
      playSounds.error();
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(null);
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  // Trigger file selection
  const triggerFileSelect = (type: 'image' | 'video') => {
    const fileRef = type === 'image' ? imageFileRef : videoFileRef;
    fileRef.current?.click();
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
            {effectiveImageUrl ? (
              <div 
                className="relative max-w-full max-h-full cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileSelect('image');
                }}
                title="Click to upload a new image"
              >
                <img 
                  src={effectiveImageUrl} 
                  alt={currentScene.custom_image_uploaded ? "Uploaded image" : "Generated scene"} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity group-hover:opacity-80"
                />
                {currentScene.custom_image_uploaded && (
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/80">
                    uploaded
                  </div>
                )}
                {/* Upload overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-sm font-light">upload</span>
                  </div>
                </div>
              </div>
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
            {effectiveVideoUrl ? (
              <div 
                className="relative max-w-full max-h-full cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileSelect('video');
                }}
                title="Click to upload a new video"
              >
                <video 
                  src={effectiveVideoUrl} 
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-2xl transition-opacity group-hover:opacity-80"
                  onClick={(e) => e.stopPropagation()} // Don't trigger upload when clicking video controls
                />
                {currentScene.custom_video_uploaded && (
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/80">
                    uploaded
                  </div>
                )}
                {/* Upload overlay on hover (only when not hovering over controls) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-sm font-light">upload</span>
                  </div>
                </div>
              </div>
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
              
              <div className="space-y-3">
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
                
                {!effectiveImageUrl && (
                  <div className="flex items-center gap-3 text-white/50 text-xs">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <span>or</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                  </div>
                )}
                
                {!effectiveImageUrl && (
                  <button
                    onClick={() => triggerFileSelect('image')}
                    onMouseEnter={() => !uploading && playSounds.hover()}
                    disabled={uploading === 'image'}
                    className="w-full py-3 text-white hover:text-white/80 transition-colors flex items-center justify-center text-sm font-medium disabled:opacity-50"
                  >
                    {uploading === 'image' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      'upload'
                    )}
                  </button>
                )}
                
                {uploadProgress && uploading === 'image' && (
                  <p className="text-center text-xs text-white/60">{uploadProgress}</p>
                )}
              </div>
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
              
              <div className="space-y-3">
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
                
                {!effectiveVideoUrl && (
                  <div className="flex items-center gap-3 text-white/50 text-xs">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <span>or</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                  </div>
                )}
                
                {!effectiveVideoUrl && (
                  <button
                    onClick={() => triggerFileSelect('video')}
                    onMouseEnter={() => !uploading && playSounds.hover()}
                    disabled={uploading === 'video'}
                    className="w-full py-3 text-white hover:text-white/80 transition-colors flex items-center justify-center text-sm font-medium disabled:opacity-50"
                  >
                    {uploading === 'video' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      'upload'
                    )}
                  </button>
                )}
                
                {uploadProgress && uploading === 'video' && (
                  <p className="text-center text-xs text-white/60">{uploadProgress}</p>
                )}
              </div>
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
      
      {/* Hidden file inputs */}
      <input
        ref={imageFileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={() => handleUpload('image')}
      />
      <input
        ref={videoFileRef}
        type="file"
        accept="video/mp4,video/mov,video/quicktime"
        style={{ display: 'none' }}
        onChange={() => handleUpload('video')}
      />
    </div>
  );
} 