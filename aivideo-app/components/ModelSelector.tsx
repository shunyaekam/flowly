'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore, Scene } from '@/lib/store';
import { playSounds } from '@/lib/sounds';

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'image' | 'video' | 'audio';
  sceneId?: string; // If provided, selects for specific scene; otherwise for global settings
  onModelSelect: (modelId: string, customParams?: Record<string, unknown>) => void;
}

interface ReplicateModel {
  owner: string;
  name: string;
  description?: string;
  run_count?: number;
  cover_image_url?: string;
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  default_example?: {
    input: Record<string, unknown>;
    output: string | string[];
  };
  latest_version?: {
    id: string;
    created_at: string;
    openapi_schema?: {
      components?: {
        schemas?: {
          Input?: {
            properties?: Record<string, unknown>;
          };
          Output?: {
            type?: string;
            format?: string;
          };
        };
      };
    };
  };
}

export default function ModelSelector({ isOpen, onClose, type, sceneId, onModelSelect }: ModelSelectorProps) {
  const { settings, storyboardData } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState<ReplicateModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<ReplicateModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ReplicateModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showParameters, setShowParameters] = useState(false);
  const [editableParams, setEditableParams] = useState<Record<string, unknown>>({});

  // Get currently selected model ID
  const getCurrentModelId = () => {
    if (sceneId) {
      // Scene-specific model selection
      const scene = storyboardData?.scenes.find(s => s.id === sceneId);
      return scene?.[`selected_${type}_model` as keyof Scene] as string || settings[`selected_${type}_model` as keyof typeof settings] as string;
    } else {
      // Global model selection
      return settings[`selected_${type}_model` as keyof typeof settings] as string;
    }
  };

  // Categorize model based on output type
  const categorizeModel = (model: ReplicateModel): 'image' | 'video' | 'audio' | null => {
    const description = model.description?.toLowerCase() || '';
    const name = model.name.toLowerCase();
    
    // Check output schema first if available
    const outputSchema = model.latest_version?.openapi_schema?.components?.schemas?.Output;
    if (outputSchema) {
      const outputType = outputSchema.type?.toLowerCase();
      const outputFormat = outputSchema.format?.toLowerCase();
      
      // Check if output format indicates audio
      if (outputFormat?.includes('audio') || outputFormat?.includes('wav') || outputFormat?.includes('mp3') || outputFormat?.includes('m4a') || outputFormat?.includes('flac')) {
        return 'audio';
      }
      
      // Check if output format indicates video  
      if (outputFormat?.includes('video') || outputFormat?.includes('mp4') || outputFormat?.includes('mov') || outputFormat?.includes('webm') || outputFormat?.includes('avi')) {
        return 'video';
      }
    }

    // Check example output
    if (model.default_example?.output) {
      const output = Array.isArray(model.default_example.output) 
        ? model.default_example.output[0] 
        : model.default_example.output;
      
      if (typeof output === 'string') {
        const outputLower = output.toLowerCase();
        // Audio files or URLs with audio extensions
        if (outputLower.includes('.mp3') || outputLower.includes('.wav') || outputLower.includes('.m4a') || outputLower.includes('.flac') || outputLower.includes('.ogg') || outputLower.includes('.aac')) {
          return 'audio';
        }
        // Video files
        if (outputLower.includes('.mp4') || outputLower.includes('.mov') || outputLower.includes('.webm') || outputLower.includes('.avi') || outputLower.includes('.mkv')) {
          return 'video';
        }
        // Image files
        if (outputLower.includes('.jpg') || outputLower.includes('.png') || outputLower.includes('.webp') || outputLower.includes('.gif') || outputLower.includes('.jpeg')) {
          return 'image';
        }
      }
    }

    // Audio models: anything that produces or adds audio
    if (/\b(audio|music|sound|speech|voice|tts|text-to-speech|musicgen|audioldm|bark|whisper|sound.*effect|ambient|foley|soundtrack|score|composition|beat|rhythm|melody|harmony|synthesiz|audio.*generat|sound.*generat|add.*audio|audio.*to.*video|video.*to.*audio|dub|narrator|voiceover|sing|vocal|instrument|tone|frequency|wave|acoustic|sonic|hear|listen|noise|echo|reverb|mix|master|produce.*music|create.*sound|generate.*music)\b/.test(description) ||
        /\b(audio|music|sound|speech|voice|tts|musicgen|audioldm|bark|whisper|foley|soundtrack|score|beat|rhythm|melody|synthesiz|vocal|sing|sonic|acoustic)\b/.test(name)) {
      return 'audio';
    }

    // Video models
    if (/\b(video|animate|motion|clip|movie|footage|generate.*video|film|cinema|scene|frame|fps|resolution|render|edit|cut|transition|effect|visual|moving|dynamic|sequence)\b/.test(description) ||
        /\b(video|animate|motion|film|cinema|movie|clip)\b/.test(name)) {
      return 'video';
    }

    // Default to image for most models
    return 'image';
  };

  // Search models using Replicate API
  const searchModels = useCallback(async (searchQuery: string) => {
    if (!settings.replicate_api_key || !searchQuery.trim()) return;
    
    setLoading(true);
    
    try {
      console.log('Searching models for:', searchQuery);
      
      const response = await fetch(`/api/models`, {
        method: 'POST',
        headers: {
          'x-replicate-token': settings.replicate_api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const searchResults = data.results || [];
      
      // Filter by type and categorize
      const categoryModels = searchResults.filter((model: ReplicateModel) => {
        const category = categorizeModel(model);
        const hasPromptInput = model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties?.prompt;
        return category === type && hasPromptInput;
      });

      // Sort by popularity (run_count) descending, then by name
      const sortedModels = categoryModels.sort((a: ReplicateModel, b: ReplicateModel) => {
        const aRunCount = a.run_count || 0;
        const bRunCount = b.run_count || 0;
        
        if (aRunCount !== bRunCount) {
          return bRunCount - aRunCount; // Higher run count first
        }
        
        // If run counts are equal, sort by name alphabetically
        return a.name.localeCompare(b.name);
      });

      setFilteredModels(sortedModels);
      console.log(`Found ${categoryModels.length} ${type} models for search: ${searchQuery}`);
      
    } catch (error) {
      console.error('Failed to search models:', error);
      // Fall back to client-side filtering of loaded models
      const filteredResults = models.filter((model: ReplicateModel) => {
        const modelId = `${model.owner}/${model.name}`;
        const description = model.description?.toLowerCase() || '';
        const name = model.name.toLowerCase();
        const owner = model.owner.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        
        return modelId.toLowerCase().includes(searchLower) ||
               name.includes(searchLower) ||
               owner.includes(searchLower) ||
               description.includes(searchLower);
      });

      // Sort by popularity
      const sortedResults = filteredResults.sort((a: ReplicateModel, b: ReplicateModel) => {
        const aRunCount = a.run_count || 0;
        const bRunCount = b.run_count || 0;
        
        if (aRunCount !== bRunCount) {
          return bRunCount - aRunCount; // Higher run count first
        }
        
        return a.name.localeCompare(b.name);
      });

      setFilteredModels(sortedResults);
    } finally {
      setLoading(false);
    }
  }, [settings.replicate_api_key, type, models]);

  // Fetch models from our API route
  const fetchModels = useCallback(async (loadMore = false) => {
    if (!settings.replicate_api_key) return;
    
    setLoading(true);
    
    let url = `/api/models?limit=25`;
    if (cursor && loadMore) {
      url += `&cursor=${cursor}`;
    }
    
    try {
      console.log('Making API request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'x-replicate-token': settings.replicate_api_key,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const newModels = data.results || [];
      
      // Filter by type only
      const categoryModels = newModels.filter((model: ReplicateModel) => {
        const category = categorizeModel(model);
        const hasPromptInput = model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties?.prompt;
        
        return category === type && hasPromptInput;
      });

      if (loadMore) {
        setModels(prev => {
          const existingIds = new Set(prev.map((m: ReplicateModel) => `${m.owner}/${m.name}`));
          const newUniqueModels = categoryModels.filter((m: ReplicateModel) => !existingIds.has(`${m.owner}/${m.name}`));
          const allModels = [...prev, ...newUniqueModels];
          
          // Sort by popularity after adding new models
          return allModels.sort((a: ReplicateModel, b: ReplicateModel) => {
            const aRunCount = a.run_count || 0;
            const bRunCount = b.run_count || 0;
            
            if (aRunCount !== bRunCount) {
              return bRunCount - aRunCount; // Higher run count first
            }
            
            return a.name.localeCompare(b.name);
          });
        });
      } else {
        // Sort initial models by popularity
        const sortedModels = categoryModels.sort((a: ReplicateModel, b: ReplicateModel) => {
          const aRunCount = a.run_count || 0;
          const bRunCount = b.run_count || 0;
          
          if (aRunCount !== bRunCount) {
            return bRunCount - aRunCount; // Higher run count first
          }
          
          return a.name.localeCompare(b.name);
        });
        setModels(sortedModels);
      }

      console.log(`Fetched ${categoryModels.length} ${type} models`);

      setCursor(data.next?.split('cursor=')[1] || null);
      setHasMore(!!data.next);

      // Auto-load more if we don't have enough models yet and not searching
      if (!loadMore && categoryModels.length < 10 && data.next) {
        setTimeout(() => fetchModels(true), 100);
      }
      
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setModels([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [settings.replicate_api_key, type, cursor]);

  // Load current model specifically if not found in initial batch
  const loadCurrentModel = useCallback(async (currentModelId: string) => {
    if (!currentModelId || !settings.replicate_api_key) return;

    console.log(`Loading current model: ${currentModelId}`);
    
    try {
      // Try searching for the specific model using the POST method
      const response = await fetch(`/api/models`, {
        method: 'POST',
        headers: {
          'x-replicate-token': settings.replicate_api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: currentModelId })
      });

      if (!response.ok) {
        console.log(`Search failed, status: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('Search response data:', data);
      
      const currentModel = data.results?.find((m: ReplicateModel) => `${m.owner}/${m.name}` === currentModelId);
      
      if (currentModel) {
        const category = categorizeModel(currentModel);
        console.log(`Found model ${currentModelId}, category: ${category}, target type: ${type}`);
        
        if (category === type) {
          console.log(`Adding current model ${currentModelId} to models list`);
          setModels(prev => {
            const existingIds = new Set(prev.map((m: ReplicateModel) => `${m.owner}/${m.name}`));
            if (!existingIds.has(currentModelId)) {
              return [currentModel, ...prev];
            }
            return prev;
          });
        } else {
          console.log(`Model ${currentModelId} category (${category}) doesn't match type (${type})`);
        }
      } else {
        console.log(`Model ${currentModelId} not found in search`);
      }
    } catch (error) {
      console.error('Failed to load current model:', error);
    }
  }, [settings.replicate_api_key, type]);

  // Initial load with auto-loading
  useEffect(() => {
    if (isOpen && settings.replicate_api_key) {
      setModels([]);
      setCursor(null);
      setHasMore(true);
      setSelectedModel(null);
      
      const currentModelId = getCurrentModelId();
      
      fetchModels(false);
      
      // Try to load current model regardless - it will be added if not already present
      if (currentModelId) {
        setTimeout(() => loadCurrentModel(currentModelId), 500);
      }
    }
  }, [isOpen, settings.replicate_api_key, type]);

  // Handle search with debouncing
  useEffect(() => {
    if (!settings.replicate_api_key) return;

    if (searchTerm.trim() === '') {
      // If search is empty, show all loaded models sorted by popularity
      const sortedModels = [...models].sort((a: ReplicateModel, b: ReplicateModel) => {
        const aRunCount = a.run_count || 0;
        const bRunCount = b.run_count || 0;
        
        if (aRunCount !== bRunCount) {
          return bRunCount - aRunCount; // Higher run count first
        }
        
        return a.name.localeCompare(b.name);
      });
      setFilteredModels(sortedModels);
      return;
    }

    const debounceTimer = setTimeout(() => {
      console.log('Searching for:', searchTerm);
      // Use the new searchModels function for server-side search
      searchModels(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchModels]);

  // Set filtered models when models change (but only if not searching)
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredModels(models);
    }
    // If searching, don't override the search results
  }, [models, searchTerm]);

  // Auto-select current model when models change (separate effect to avoid loops)
  useEffect(() => {
    const currentModelId = getCurrentModelId();
    console.log('Checking for current model to auto-select:', currentModelId);
    console.log('Models available:', models.length);
    console.log('Currently selected model:', selectedModel?.name);
    
    if (currentModelId && models.length > 0 && !selectedModel) {
      const currentModel = models.find(m => `${m.owner}/${m.name}` === currentModelId);
      console.log('Found matching current model:', !!currentModel);
      
      if (currentModel) {
        console.log('Auto-selecting current model:', currentModelId);
        setSelectedModel(currentModel);
        
        // Load existing parameters from settings/scene
        let existingParams: Record<string, unknown> = {};
        
        if (sceneId) {
          // Load scene-specific parameters
          const scene = storyboardData?.scenes.find(s => s.id === sceneId);
          const paramsKey = `${type}_model_params` as keyof Scene;
          existingParams = scene?.[paramsKey] as Record<string, unknown> || {};
        } else {
          // Load global parameters
          const paramsKey = `${type}_model_params` as keyof typeof settings;
          existingParams = settings[paramsKey] as Record<string, unknown> || {};
        }
        
        // Initialize parameters with existing values or defaults
        const schema = currentModel.latest_version?.openapi_schema;
        const inputProps = schema?.components?.schemas?.Input?.properties || {};
        const initialParams: Record<string, unknown> = {};
        
        Object.entries(inputProps).forEach(([key, prop]: [string, unknown]) => {
          const propObj = prop as Record<string, unknown>;
          if (existingParams[key] !== undefined) {
            initialParams[key] = existingParams[key];
          } else if (propObj.default !== undefined) {
            initialParams[key] = propObj.default;
          }
        });
        
        console.log('Loaded existing parameters for current model:', initialParams);
        setEditableParams(initialParams);
      }
    }
  }, [models, selectedModel, sceneId, type]);

  const handleModelSelect = (model: ReplicateModel) => {
    setSelectedModel(model);
    
    // Initialize editable parameters with defaults
    const schema = model.latest_version?.openapi_schema;
    const inputProps = schema?.components?.schemas?.Input?.properties || {};
    const initialParams: Record<string, unknown> = {};
    
    Object.entries(inputProps).forEach(([key, prop]: [string, unknown]) => {
      const propObj = prop as Record<string, unknown>;
      if (propObj.default !== undefined) {
        initialParams[key] = propObj.default;
      }
    });
    
    setEditableParams(initialParams);
    setShowParameters(false); // Reset parameters view
  };

  const handleConfirmSelection = () => {
    if (selectedModel) {
      const modelId = `${selectedModel.owner}/${selectedModel.name}`;
      console.log('Selecting model:', modelId, 'with params:', editableParams);
      // Pass model ID and custom parameters
      onModelSelect(modelId, editableParams);
      playSounds.ok(); // Success sound
      onClose();
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchModels(true);
    }
  };

  // Auto-load on scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading]);

  const handleClose = () => {
    playSounds.cancel();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-lg">
      <div className="h-full flex">
        {/* Left Panel - Search & List */}
        <div className="w-1/2 h-full p-8 pr-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-white">
              {type} models
            </h2>
            <button
              onClick={handleClose}
              onMouseEnter={() => playSounds.hover()}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search - Fixed position */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={`search ${type} models...`}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-b-white/40"
            />
          </div>

          {/* Models List - Scrollable */}
          <div 
            className="overflow-y-auto" 
            style={{ height: 'calc(100vh - 200px)' }}
            onScroll={handleScroll}
          >
            <div className="space-y-2">
              {!settings.replicate_api_key ? (
                <div className="text-center py-8">
                  <p className="text-white/50 text-sm mb-2">replicate api key required</p>
                  <p className="text-white/30 text-xs">add your api key in settings to browse models</p>
                </div>
              ) : filteredModels.length === 0 && !loading ? (
                <div className="text-center py-8">
                  <p className="text-white/50 text-sm">no models found</p>
                  <p className="text-white/30 text-xs">try adjusting your search or check your api key</p>
                </div>
              ) : (
                filteredModels.map((model) => (
                  <div
                    key={`${model.owner}/${model.name}`}
                    onClick={() => handleModelSelect(model)}
                    onMouseEnter={() => playSounds.hover()}
                    className={`p-4 rounded cursor-pointer transition-colors ${
                      selectedModel?.name === model.name && selectedModel?.owner === model.owner
                        ? 'bg-transparent border border-white/20'
                        : 'hover:bg-transparent border border-transparent hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-sm">
                          {model.name}
                        </h3>
                        <p className="text-white/60 text-xs mb-1">
                          by {model.owner}
                        </p>
                        <p className="text-white/50 text-xs line-clamp-2">
                          {model.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-white/40 ml-4">
                        {model.run_count ? `${model.run_count.toLocaleString()} runs` : '—'}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Load More */}
              {hasMore && !loading && settings.replicate_api_key && (
                <button
                  onClick={loadMore}
                  onMouseEnter={() => playSounds.hover()}
                  className="w-full py-3 text-white/60 hover:text-white transition-colors text-sm"
                >
                  load more models...
                </button>
              )}

              {loading && (
                <div className="text-center py-4">
                  <span className="text-white/50 text-sm">loading models...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Model Details */}
        <div className="w-1/2 h-full p-8 pl-4">
          {selectedModel ? (
            <div className="h-full flex flex-col">
              {/* Model Header - Fixed */}
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">
                  {selectedModel.name}
                </h2>
                <p className="text-white/60 text-sm mb-4">
                  by {selectedModel.owner}
                </p>
                <p className="text-white/80 text-sm leading-relaxed mb-4">
                  {selectedModel.description}
                </p>

                {/* Model Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-white/50 text-xs">runs:</span>
                    <p className="text-white text-sm">
                      {selectedModel.run_count?.toLocaleString() || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/50 text-xs">version:</span>
                    <p className="text-white text-sm font-mono">
                      {selectedModel.latest_version?.id?.slice(0, 8) || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto mb-6">
                {/* Example - Side by side layout */}
                {selectedModel.default_example && (
                  <div className="mb-6">
                    <h3 className="text-white font-medium text-sm mb-3">example output:</h3>
                    {/* Only show Output Media */}
                    {selectedModel.cover_image_url && (
                      <div>
                        <img 
                          src={selectedModel.cover_image_url} 
                          alt="model example"
                          className="w-full max-w-sm rounded border border-white/10"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Editable Parameters */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowParameters(!showParameters)}
                    className="flex items-center gap-2 text-white font-medium text-sm mb-3 hover:text-white/80 transition-colors"
                  >
                    parameters {showParameters ? '(hide)' : '(show)'}
                    {showParameters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showParameters && selectedModel.latest_version?.openapi_schema?.components?.schemas?.Input?.properties && (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(selectedModel.latest_version.openapi_schema.components.schemas.Input.properties).map(([key, prop]: [string, unknown]) => (
                        <div key={key} className="bg-transparent p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-mono">{key}</span>
                            <span className="text-white/50 text-xs">{(prop as Record<string, unknown>).type as string}</span>
                          </div>
                          {(prop as Record<string, unknown>).description && typeof (prop as Record<string, unknown>).description === 'string' ? (
                            <p className="text-white/70 text-xs mb-3">{String((prop as Record<string, unknown>).description)}</p>
                          ) : null}
                          
                          {/* Editable Input */}
                          {key !== 'prompt' && ( // Skip prompt as it's handled separately
                            <div>
                              {(prop as Record<string, unknown>).type === 'boolean' ? (
                                <select
                                  value={editableParams[key] !== undefined ? String(editableParams[key]) : String((prop as Record<string, unknown>).default || false)}
                                  onChange={(e) => setEditableParams(prev => ({
                                    ...prev,
                                    [key]: e.target.value === 'true'
                                  }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 bg-white/10 border border-white/20 text-white text-sm rounded focus:outline-none focus:border-white/40"
                                >
                                  <option value="true" className="bg-gray-800">true</option>
                                  <option value="false" className="bg-gray-800">false</option>
                                </select>
                              ) : (prop as Record<string, unknown>).type === 'number' || (prop as Record<string, unknown>).type === 'integer' ? (
                                <input
                                  type="number"
                                  value={editableParams[key] !== undefined ? String(editableParams[key]) : String((prop as Record<string, unknown>).default || '')}
                                  onChange={(e) => setEditableParams(prev => ({
                                    ...prev,
                                    [key]: (prop as Record<string, unknown>).type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0
                                  }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 bg-white/10 border border-white/20 text-white text-sm rounded focus:outline-none focus:border-white/40"
                                  step={(prop as Record<string, unknown>).type === 'integer' ? '1' : '0.1'}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={editableParams[key] !== undefined ? String(editableParams[key]) : String((prop as Record<string, unknown>).default || '')}
                                  onChange={(e) => setEditableParams(prev => ({
                                    ...prev,
                                    [key]: e.target.value
                                  }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 bg-white/10 border border-white/20 text-white text-sm rounded focus:outline-none focus:border-white/40"
                                />
                              )}
                              <p className="text-white/40 text-xs mt-1">
                                default: {String((prop as Record<string, unknown>).default)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Select Button - Fixed at bottom */}
              <button
                onClick={handleConfirmSelection}
                onMouseEnter={() => playSounds.hover()}
                className="w-full py-3 bg-transparent text-white font-light hover:text-white/80 transition-colors"
              >
                select model
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/50 text-sm">
                select a model from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}