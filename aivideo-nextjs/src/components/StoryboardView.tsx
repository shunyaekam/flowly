'use client';

import React, { useState } from 'react';
import { useAppStore, defaultModels, defaultModes } from '@/lib/store';
import { Scene, GenerationStep } from '@/types';
import { ArrowLeft, Settings, Play, Download, Folder, ChevronDown, Image, Video, Volume2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Edit Scene</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Scene Text</label>
              <input
                type="text"
                value={editedScene.scene_text}
                onChange={(e) => setEditedScene({...editedScene, scene_text: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Image Prompt</label>
              <textarea
                value={editedScene.scene_image_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_image_prompt: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Video Prompt</label>
              <textarea
                value={editedScene.scene_video_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_video_prompt: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sound Prompt</label>
              <textarea
                value={editedScene.scene_sound_prompt}
                onChange={(e) => setEditedScene({...editedScene, scene_sound_prompt: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
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
    selectedModel, 
    setSelectedModel,
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

  const getGenerationStepIcon = (step: GenerationStep) => {
    switch (step) {
      case 'images': return <Image className="w-4 h-4" />;
      case 'videos': return <Video className="w-4 h-4" />;
      case 'sounds': return <Volume2 className="w-4 h-4" />;
    }
  };

  const getGenerationStepLabel = (step: GenerationStep) => {
    switch (step) {
      case 'images': return 'Generate All Images';
      case 'videos': return 'Generate All Videos';
      case 'sounds': return 'Generate All Sounds';
    }
  };

  const canGenerateStep = (step: GenerationStep) => {
    if (step === 'images') return true;
    if (step === 'videos') return storyboardData.scenes.some(scene => scene.image_url);
    if (step === 'sounds') return storyboardData.scenes.some(scene => scene.video_url);
    return false;
  };

  const handleSelectFolder = () => {
    // In a real app, you'd use a file picker library or electron API
    // For now, we'll just show a simple input
    const newDir = prompt('Enter save directory path:', saveDirectory);
    if (newDir) {
      setSaveDirectory(newDir);
    }
  };

  const handleSaveAll = () => {
    // Implementation for saving all videos to selected directory
    alert(`Saving all videos to: ${saveDirectory}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Settings */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('input')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Input</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">AI Video Generator</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Model Selection */}
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const model = defaultModels.find(m => m.id === e.target.value);
                  if (model) setSelectedModel(model);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {defaultModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              
              {/* Mode Selection */}
              <select
                value={selectedMode.id}
                onChange={(e) => {
                  const mode = defaultModes.find(m => m.id === e.target.value);
                  if (mode) setSelectedMode(mode);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {defaultModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Generate All Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowGenerateDropdown(!showGenerateDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Generate All</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showGenerateDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                    {(['images', 'videos', 'sounds'] as GenerationStep[]).map((step) => (
                      <button
                        key={step}
                        onClick={() => handleGenerateAll(step)}
                        disabled={!canGenerateStep(step) || generationStatus[step] === 'generating'}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
                          !canGenerateStep(step) || generationStatus[step] === 'generating'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {getGenerationStepIcon(step)}
                        <span>
                          {generationStatus[step] === 'generating' 
                            ? `Generating ${step}...` 
                            : getGenerationStepLabel(step)
                          }
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Generation Status */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {Object.entries(generationStatus).map(([step, status]) => (
                  <div key={step} className="flex items-center space-x-1">
                    {getGenerationStepIcon(step as GenerationStep)}
                    <span className={`capitalize ${
                      status === 'generating' ? 'text-blue-600' : 
                      status === 'complete' ? 'text-green-600' : 
                      status === 'error' ? 'text-red-600' : ''
                    }`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Folder Selector */}
              <button
                onClick={handleSelectFolder}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <Folder className="w-4 h-4" />
                <span>Select Folder</span>
              </button>
              
              {/* Save All Button */}
              <button
                onClick={handleSaveAll}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Download className="w-4 h-4" />
                <span>Save All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Storyboard Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storyboardData.scenes.map((scene, index) => (
            <div key={scene.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Scene {index + 1}</h3>
                  <button
                    onClick={() => setSelectedScene(scene)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="min-h-[120px] bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {scene.image_url ? (
                      <img 
                        src={scene.image_url} 
                        alt={`Scene ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : scene.is_generating_image ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Generating image...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Image className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No image yet</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">{scene.scene_text}</p>
                  </div>
                  
                  {/* Generation Status */}
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${scene.image_generated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Image</span>
                    <div className={`w-2 h-2 rounded-full ${scene.video_generated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Video</span>
                    <div className={`w-2 h-2 rounded-full ${scene.sound_generated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Sound</span>
                  </div>
                </div>
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