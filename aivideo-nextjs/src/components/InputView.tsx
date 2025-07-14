'use client';

import { useState } from 'react';
import { useAppStore, defaultModels, defaultModes } from '@/lib/store';
import { Settings, Loader2 } from 'lucide-react';

export default function InputView() {
  const { 
    setCurrentView, 
    setStoryboardData, 
    selectedModel, 
    setSelectedModel,
    selectedMode, 
    setSelectedMode,
    setShowSettings,
    settings
  } = useAppStore();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddMode, setShowAddMode] = useState(false);
  const [newMode, setNewMode] = useState({ name: '', description: '', prompt_template: '' });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // Call OpenAI API to generate storyboard
      const response = await fetch('/api/generate/storyboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: selectedMode,
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

  const handleAddMode = () => {
    if (newMode.name && newMode.description && newMode.prompt_template) {
      // In a real implementation, you'd add this to the store
      // For now, we'll just close the modal
      setShowAddMode(false);
      setNewMode({ name: '', description: '', prompt_template: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Video Generator</h1>
          <p className="text-lg text-gray-600">Create engaging videos from your ideas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              What video do you want to create?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your video concept, story, or topic..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-4">
            {/* Model Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const model = defaultModels.find(m => m.id === e.target.value);
                  if (model) setSelectedModel(model);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              >
                {defaultModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Dropdown with Add Mode Option */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
              <div className="relative">
                <select
                  value={selectedMode.id}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowAddMode(true);
                    } else {
                      const mode = defaultModes.find(m => m.id === e.target.value);
                      if (mode) setSelectedMode(mode);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isGenerating}
                >
                  {defaultModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name} - {mode.description}
                    </option>
                  ))}
                  <option value="add_new">+ Add Mode</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Storyboard</span>
              )}
            </button>
          </div>
        </div>

        {/* Add Mode Modal */}
        {showAddMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold mb-4">Add Custom Mode</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={newMode.name}
                    onChange={(e) => setNewMode({...newMode, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Horror Stories"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={newMode.description}
                    onChange={(e) => setNewMode({...newMode, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of this mode"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Prompt Template</label>
                  <textarea
                    value={newMode.prompt_template}
                    onChange={(e) => setNewMode({...newMode, prompt_template: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Enter the prompt template. Use {input} where the user's input should be inserted."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddMode(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 