'use client';

import React, { useState } from 'react';
import { useAppStore, defaultModes } from '@/lib/store';
import { Scene, GenerationStep } from '@/types';
import { ArrowLeft, Settings } from 'lucide-react';

interface SceneModalProps {
  scene: Scene;
  onClose: () => void;
  onUpdate: (updates: Partial<Scene>) => void;
}

function SceneModal({ scene, onClose, onUpdate }: SceneModalProps) {
  const [editedScene, setEditedScene] = useState(scene);

  const handleSave = () => {
    onUpdate(editedScene);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-8 z-50">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light text-gray-900">edit scene</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <input
                type="text"
                value={editedScene.scene_text}
                onChange={(e) => setEditedScene({...editedScene, scene_text: e.target.value})}
                className="w-full px-0 py-2 text-lg border-none outline-none bg-transparent text-gray-900 font-light"
                placeholder="Scene text"
              />
              <div className="h-px bg-gray-200"></div>
            </div>
            
            <div>
              <textarea
                value={editedScene.scene_image_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_image_prompt: e.target.value})}
                className="w-full px-0 py-2 border-none outline-none bg-transparent text-gray-900 font-light resize-none"
                rows={3}
                placeholder="Image prompt"
              />
              <div className="h-px bg-gray-200"></div>
            </div>
            
            <div>
              <textarea
                value={editedScene.scene_video_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_video_prompt: e.target.value})}
                className="w-full px-0 py-2 border-none outline-none bg-transparent text-gray-900 font-light resize-none"
                rows={3}
                placeholder="Video prompt"
              />
              <div className="h-px bg-gray-200"></div>
            </div>
            
            <div>
              <textarea
                value={editedScene.scene_sound_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_sound_prompt: e.target.value})}
                className="w-full px-0 py-2 border-none outline-none bg-transparent text-gray-900 font-light resize-none"
                rows={3}
                placeholder="Sound prompt"
              />
              <div className="h-px bg-gray-200"></div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-8 mt-12">
            <button
              onClick={onClose}
              className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
            >
              cancel
            </button>
            <button
              onClick={handleSave}
              className="text-sm font-light text-gray-900 hover:text-gray-600 transition-colors"
            >
              save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoryboardView() {
  const { 
    storyboardData, 
    setCurrentView, 
    setShowSettings,
    selectedMode, 
    setSelectedMode,
    updateScene,
    generateAllStep,
    generationStatus,
    settings
  } = useAppStore();
  
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showGenerateDropdown, setShowGenerateDropdown] = useState(false);
  const [saveDirectory, setSaveDirectory] = useState(settings.save_directory);

  if (!storyboardData) {
    return <div>No storyboard data available</div>;
  }

  const handleGenerateAll = (step: GenerationStep) => {
    generateAllStep(step);
    setShowGenerateDropdown(false);
  };

  const getGenerationStepLabel = (step: GenerationStep) => {
    switch (step) {
      case 'images': return 'images';
      case 'videos': return 'videos';
      case 'sounds': return 'sounds';
    }
  };

  const canGenerateStep = (step: GenerationStep) => {
    if (step === 'images') return true;
    if (step === 'videos') return storyboardData.scenes.some(scene => scene.image_url);
    if (step === 'sounds') return storyboardData.scenes.some(scene => scene.video_url);
    return false;
  };

  const handleSelectFolder = () => {
    const newDir = prompt('Enter save directory path:', saveDirectory);
    if (newDir) {
      setSaveDirectory(newDir);
    }
  };

  const handleSaveAll = () => {
    alert(`Saving all videos to: ${saveDirectory}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setCurrentView('input')}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-light text-gray-900 tracking-wide">flowly</h1>
        </div>
        
        <div className="flex items-center space-x-8">
          {/* Mode Selection */}
          <div className="flex space-x-6">
            {defaultModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode)}
                className={`text-sm font-light transition-colors ${
                  selectedMode.id === mode.id 
                    ? 'text-gray-900' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          {/* Generate All Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGenerateDropdown(!showGenerateDropdown)}
              className="text-sm font-light text-gray-900 hover:text-gray-600 transition-colors"
            >
              generate all
            </button>
            
            {showGenerateDropdown && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white border border-gray-100 z-10">
                {(['images', 'videos', 'sounds'] as GenerationStep[]).map((step) => (
                  <button
                    key={step}
                    onClick={() => handleGenerateAll(step)}
                    disabled={!canGenerateStep(step) || generationStatus[step] === 'generating'}
                    className={`w-full text-left px-4 py-2 text-sm font-light hover:bg-gray-50 transition-colors ${
                      !canGenerateStep(step) || generationStatus[step] === 'generating'
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    {generationStatus[step] === 'generating' 
                      ? `generating...` 
                      : getGenerationStepLabel(step)
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Generation Status */}
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            {Object.entries(generationStatus).map(([step, status]) => (
              <div key={step} className="flex items-center space-x-1">
                <span className={`capitalize ${
                  status === 'generating' ? 'text-gray-600' : 
                  status === 'complete' ? 'text-gray-900' : 
                  status === 'error' ? 'text-red-500' : ''
                }`}>
                  {step}: {status}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <button
            onClick={handleSelectFolder}
            className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
          >
            select folder
          </button>
          
          <button
            onClick={handleSaveAll}
            className="text-sm font-light text-gray-900 hover:text-gray-600 transition-colors"
          >
            save all
          </button>
        </div>
      </div>

      {/* Storyboard Grid */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {storyboardData.scenes.map((scene, index) => (
            <div key={scene.id} className="group cursor-pointer" onClick={() => setSelectedScene(scene)}>
              <div className="mb-4">
                <div className="aspect-[9/16] bg-gray-50 flex items-center justify-center relative overflow-hidden">
                  {scene.image_url ? (
                    <img 
                      src={scene.image_url} 
                      alt={`Scene ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : scene.is_generating_image ? (
                    <div className="text-center">
                      <div className="text-xs text-gray-400">generating...</div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-300">
                      <div className="text-xs">scene {index + 1}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm font-light text-gray-900 mb-2">
                {scene.scene_text}
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className={`w-1 h-1 rounded-full ${scene.image_generated ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
                <div className={`w-1 h-1 rounded-full ${scene.video_generated ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
                <div className={`w-1 h-1 rounded-full ${scene.sound_generated ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scene Modal */}
      {selectedScene && (
        <SceneModal
          scene={selectedScene}
          onClose={() => setSelectedScene(null)}
          onUpdate={(updates) => updateScene(selectedScene.id, updates)}
        />
      )}
    </div>
  );
} 