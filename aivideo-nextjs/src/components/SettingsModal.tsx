'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore, storyboardModels, imageModels, videoModels, soundModels } from '@/lib/store';

export default function SettingsModal() {
  const { settings, setSettings, showSettings, setShowSettings } = useAppStore();
  const [formData, setFormData] = useState({
    openai_api_key: settings.openai_api_key,
    replicate_api_token: settings.replicate_api_token,
    selected_storyboard_model: settings.selected_storyboard_model,
    selected_image_model: settings.selected_image_model,
    selected_video_model: settings.selected_video_model,
    selected_sound_model: settings.selected_sound_model,
    general_prompt: settings.general_prompt,
    save_directory: settings.save_directory,
  });

  const handleSave = () => {
    setSettings({
      ...settings,
      ...formData,
    });
    setShowSettings(false);
  };

  const handleCancel = () => {
    setFormData({
      openai_api_key: settings.openai_api_key,
      replicate_api_token: settings.replicate_api_token,
      selected_storyboard_model: settings.selected_storyboard_model,
      selected_image_model: settings.selected_image_model,
      selected_video_model: settings.selected_video_model,
      selected_sound_model: settings.selected_sound_model,
      general_prompt: settings.general_prompt,
      save_directory: settings.save_directory,
    });
    setShowSettings(false);
  };

  const handleSelectFolder = () => {
    const newDir = prompt('Enter save directory path:', formData.save_directory);
    if (newDir) {
      setFormData({ ...formData, save_directory: newDir });
    }
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-8 z-50">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-light text-gray-900">settings</h2>
            <button
              onClick={handleCancel}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* API Keys */}
          <div className="mb-12">
            <h3 className="text-lg font-light text-gray-900 mb-6">api keys</h3>
            
            <div className="space-y-6">
              <div>
                <input
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder="openai api key"
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light placeholder-gray-400"
                />
                <div className="h-px bg-gray-200"></div>
              </div>

              <div>
                <input
                  type="password"
                  value={formData.replicate_api_token}
                  onChange={(e) => setFormData({ ...formData, replicate_api_token: e.target.value })}
                  placeholder="replicate api token"
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light placeholder-gray-400"
                />
                <div className="h-px bg-gray-200"></div>
              </div>
            </div>
          </div>

          {/* Models */}
          <div className="mb-12">
            <h3 className="text-lg font-light text-gray-900 mb-6">models</h3>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Storyboard Model */}
              <div>
                <div className="text-sm font-light text-gray-600 mb-2">storyboard</div>
                <select
                  value={formData.selected_storyboard_model}
                  onChange={(e) => setFormData({ ...formData, selected_storyboard_model: e.target.value })}
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light"
                >
                  {storyboardModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="h-px bg-gray-200"></div>
              </div>

              {/* Image Model */}
              <div>
                <div className="text-sm font-light text-gray-600 mb-2">image</div>
                <select
                  value={formData.selected_image_model}
                  onChange={(e) => setFormData({ ...formData, selected_image_model: e.target.value })}
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light"
                >
                  {imageModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="h-px bg-gray-200"></div>
              </div>

              {/* Video Model */}
              <div>
                <div className="text-sm font-light text-gray-600 mb-2">video</div>
                <select
                  value={formData.selected_video_model}
                  onChange={(e) => setFormData({ ...formData, selected_video_model: e.target.value })}
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light"
                >
                  {videoModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="h-px bg-gray-200"></div>
              </div>

              {/* Sound Model */}
              <div>
                <div className="text-sm font-light text-gray-600 mb-2">sound</div>
                <select
                  value={formData.selected_sound_model}
                  onChange={(e) => setFormData({ ...formData, selected_sound_model: e.target.value })}
                  className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light"
                >
                  {soundModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="h-px bg-gray-200"></div>
              </div>
            </div>
          </div>

          {/* Save Directory */}
          <div className="mb-12">
            <h3 className="text-lg font-light text-gray-900 mb-6">save directory</h3>
            
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={formData.save_directory}
                onChange={(e) => setFormData({ ...formData, save_directory: e.target.value })}
                className="flex-1 px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light"
                placeholder="./final_videos"
              />
              <button
                onClick={handleSelectFolder}
                className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
              >
                browse
              </button>
            </div>
            <div className="h-px bg-gray-200"></div>
          </div>

          {/* General Prompt */}
          <div className="mb-12">
            <h3 className="text-lg font-light text-gray-900 mb-6">general prompt</h3>
            <textarea
              value={formData.general_prompt}
              onChange={(e) => setFormData({ ...formData, general_prompt: e.target.value })}
              className="w-full px-0 py-2 text-sm border-none outline-none bg-transparent text-gray-900 font-light resize-none"
              rows={3}
              placeholder="General instructions for content generation..."
            />
            <div className="h-px bg-gray-200"></div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-8">
            <button
              onClick={handleCancel}
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