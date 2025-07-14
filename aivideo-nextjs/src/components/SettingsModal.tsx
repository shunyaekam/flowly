'use client';

import React, { useState } from 'react';
import { X, Save, Key, Folder, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function SettingsModal() {
  const { settings, setSettings, showSettings, setShowSettings } = useAppStore();
  const [formData, setFormData] = useState({
    openai_api_key: settings.openai_api_key,
    replicate_api_token: settings.replicate_api_token,
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
    // Reset form data to original settings
    setFormData({
      openai_api_key: settings.openai_api_key,
      replicate_api_token: settings.replicate_api_token,
      general_prompt: settings.general_prompt,
      save_directory: settings.save_directory,
    });
    setShowSettings(false);
  };

  const handleSelectFolder = () => {
    // In a real app, you'd use a file picker library or electron API
    // For now, we'll just show a simple input
    const newDir = prompt('Enter save directory path:', formData.save_directory);
    if (newDir) {
      setFormData({ ...formData, save_directory: newDir });
    }
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* API Keys Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Key className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for storyboard generation. Get your key at{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    OpenAI Platform
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Replicate API Token
                </label>
                <input
                  type="password"
                  value={formData.replicate_api_token}
                  onChange={(e) => setFormData({ ...formData, replicate_api_token: e.target.value })}
                  placeholder="r8_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for image, video, and sound generation. Get your token at{' '}
                  <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Replicate
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Save Directory Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Folder className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Save Directory</h3>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={formData.save_directory}
                onChange={(e) => setFormData({ ...formData, save_directory: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="./final_videos"
              />
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Directory where generated videos will be saved
            </p>
          </div>

          {/* General Prompt Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">General Prompt</h3>
            <textarea
              value={formData.general_prompt}
              onChange={(e) => setFormData({ ...formData, general_prompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="General instructions for content generation..."
            />
            <p className="text-sm text-gray-500 mt-1">
              General instructions that will be applied to all content generation
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 