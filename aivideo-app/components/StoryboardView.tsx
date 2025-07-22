'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
  addEdge,
  Connection,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore, Scene } from '@/lib/store';
import { ArrowLeft, Save, Settings, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import SettingsModal from '@/components/SettingsModal';
import SceneViewerOverlay from '@/components/SceneViewerOverlay';
import { generateImage, generateVideo, generateAudio, saveProject, pollForPrediction } from '@/lib/api';
import { playSounds } from '@/lib/sounds';

// Custom node component for storyboard scene cards
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SceneNode({ data }: any) {
  const { scene, sequenceNumber = 0 } = data;
  const hasMedia = scene.generated_image || scene.generated_video;
  const { setEditingSceneId } = useAppStore();
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSounds.openOverlay(); // System NG for opening scene overlay
    setEditingSceneId(scene.id);
  };
  
  return (
    <div className="relative">
      {/* Sequence Number */}
      <div className="absolute -top-1 -left-1 text-lg font-bold text-gray-900 z-10 pointer-events-none">
        {sequenceNumber}
      </div>
      
      {/* Before node (input/target) - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="before"
        style={{ left: -20, width: 'auto', height: 'auto', background: 'none', border: 'none' }}
        title="Connect to previous scene"
      >
        <div className="text-black hover:text-gray-700 transition-colors text-lg font-light">
          &gt;
        </div>
      </Handle>
      
      {/* Scene card */}
      <div 
        className="w-48 h-48 rounded-full bg-transparent transition-all duration-200 cursor-move overflow-hidden relative group hover:scale-105"
        style={{
          backgroundImage: hasMedia ? `url(${scene.generated_image || scene.generated_video})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => playSounds.hover()}
        title="Double-click to edit scene"
      >
        {/* Blur overlay if there's a background image */}
        {hasMedia && (
          <div className="absolute inset-0 backdrop-blur-md bg-white/70 transition-all duration-200" />
        )}
        
        {/* Scene text */}
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <p className="text-sm font-medium text-gray-800 line-clamp-6 leading-tight">
            {scene.scene}
          </p>
        </div>
        
        {/* Blur vignette hover effect */}
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
             style={{
               left: '-20px',
               top: '-20px',
               right: '-20px', 
               bottom: '-20px',
               background: 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.6) 70%)',
               backdropFilter: 'blur(8px)',
               borderRadius: '50%'
             }} />
      </div>
      
      {/* After node (output/source) - right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="after"
        className="w-4 h-4 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors rounded-full shadow-sm"
        style={{ right: -8 }}
        title="Connect to next scene"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  sceneNode: SceneNode,
};

// Function to determine scene order based on visual flow connections
function getFlowSequence(scenes: Scene[], edges: Edge[]): Scene[] {
  const sceneMap = new Map(scenes.map(scene => [scene.id, scene]));
  const visited = new Set<string>();
  const sequence: Scene[] = [];
  
  // Build adjacency list from edges
  const adjacency = new Map<string, string>();
  edges.forEach(edge => {
    adjacency.set(edge.source, edge.target);
  });
  
  // Find starting nodes (nodes with no incoming edges)
  const hasIncoming = new Set(edges.map(edge => edge.target));
  const startingNodes = scenes.filter(scene => !hasIncoming.has(scene.id));
  
  // If no clear flow, fall back to position-based ordering (left-to-right, top-to-bottom)
  if (startingNodes.length === 0 || edges.length === 0) {
    return scenes.slice().sort((a, b) => {
      const posA = a.position || { x: 0, y: 0 };
      const posB = b.position || { x: 0, y: 0 };
      
      // Sort by y-coordinate first (top to bottom), then x-coordinate (left to right)
      if (Math.abs(posA.y - posB.y) > 50) {
        return posA.y - posB.y;
      }
      return posA.x - posB.x;
    });
  }
  
  // Follow the connected flow starting from each starting node
  function followChain(nodeId: string) {
    if (visited.has(nodeId)) return;
    
    const scene = sceneMap.get(nodeId);
    if (scene) {
      visited.add(nodeId);
      sequence.push(scene);
      
      // Follow to next connected node
      const nextNodeId = adjacency.get(nodeId);
      if (nextNodeId) {
        followChain(nextNodeId);
      }
    }
  }
  
  // Start with the leftmost starting node
  const sortedStarting = startingNodes.sort((a, b) => {
    const posA = a.position || { x: 0, y: 0 };
    const posB = b.position || { x: 0, y: 0 };
    return posA.x - posB.x;
  });
  
  sortedStarting.forEach(node => followChain(node.id));
  
  // Add any remaining unvisited scenes
  scenes.forEach(scene => {
    if (!visited.has(scene.id)) {
      sequence.push(scene);
    }
  });
  
  return sequence;
}

function StoryboardFlow() {
  const { storyboardData, setCurrentView, updateScenePosition, updateScene, settings, setGeneratingScene } = useAppStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const { fitView } = useReactFlow();

  // Play storyboard sound when entering this view
  useEffect(() => {
    playSounds.storyboard();
  }, []);
  
  // Convert scenes to React Flow nodes with logical sequential flow
  const initialNodes: Node[] = useMemo(() => {
    if (!storyboardData) return [];
    
    const scenes = storyboardData.scenes;
    const sceneCount = scenes.length;
    
    // Create a logical flow layout that adapts to scene count
    const startX = 200;
    const startY = 200;
    const horizontalGap = 320;
    const verticalGap = 280;
    
    // Determine optimal layout based on scene count
    let nodesPerRow;
    if (sceneCount <= 3) nodesPerRow = sceneCount;
    else if (sceneCount <= 6) nodesPerRow = 3;
    else if (sceneCount <= 9) nodesPerRow = 3;
    else nodesPerRow = 4;
    
    return scenes.map((scene, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      // Center each row based on how many items it has
      const itemsInRow = Math.min(nodesPerRow, sceneCount - row * nodesPerRow);
      const rowStartX = startX - ((itemsInRow - 1) * horizontalGap) / 2;
      
      const x = rowStartX + col * horizontalGap;
      const y = startY + row * verticalGap;
      
              return {
          id: scene.id,
          type: 'sceneNode',
          position: scene.position || { x, y }, // Use stored position if available
          data: { 
            scene,
            sequenceNumber: index + 1 // Default sequence number based on original order
          },
          draggable: true,
        };
    });
  }, [storyboardData]);
  
  // Create sequential edges between scenes using before/after nodes
  const initialEdges: Edge[] = useMemo(() => {
    if (!storyboardData || storyboardData.scenes.length < 2) return [];
    
    return storyboardData.scenes.slice(0, -1).map((scene, index) => {
      const nextScene = storyboardData.scenes[index + 1];
      
              return {
          id: `edge-${scene.id}-${nextScene.id}`,
          source: scene.id,
          target: nextScene.id,
          sourceHandle: 'after', // Connect from "after" node
          targetHandle: 'before', // Connect to "before" node
          type: 'bezier',
          animated: false,
          style: { 
            stroke: '#000000', 
            strokeWidth: 0.5,
          },
          selectable: true,
        };
    });
  }, [storyboardData]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Calculate current sequence for dynamic numbering
  const currentSequence = useMemo(() => {
    if (!storyboardData) return [];
    return getFlowSequence(storyboardData.scenes, edges);
  }, [storyboardData, edges]);
  
  // Create sequence number mapping
  const sequenceNumbers = useMemo(() => {
    const mapping = new Map<string, number>();
    currentSequence.forEach((scene, index) => {
      mapping.set(scene.id, index + 1);
    });
    return mapping;
  }, [currentSequence]);


  
  // Update nodes when storyboard data changes
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  
  // Update nodes with current sequence numbers
  useEffect(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          sequenceNumber: sequenceNumbers.get(node.id) || 0
        }
      }))
    );
  }, [sequenceNumbers, setNodes]);
  
  // Only set initial edges once, don't override user changes
  useMemo(() => {
    if (!hasInitialized && initialEdges.length > 0) {
      setEdges(initialEdges);
      setHasInitialized(true);
    }
  }, [initialEdges, setEdges, hasInitialized]);
  
  // Handle new connections with validation
  const onConnect = useCallback(
    (params: Connection) => {
      // Only allow "after" to connect to "before"
      if (params.sourceHandle === 'after' && params.targetHandle === 'before') {
        const newEdge = {
          ...params,
          type: 'bezier',
          animated: false,
          style: { 
            stroke: '#000000', 
            strokeWidth: 0.5,
          },
          selectable: true,
        };
        playSounds.decide();
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges]
  );

  // Handle edge right-click to disconnect
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      playSounds.cancel();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  // Handle edge click (select and delete with Delete key)
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Double-click to delete edge
      if (event.detail === 2) {
        playSounds.cancel();
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [setEdges]
  );

  // Note: For edge deletion, use right-click or double-click on edges
  
  // Handle node drag end to save position
  const onNodeDragStop = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any, node: Node) => {
      updateScenePosition(node.id, node.position);
    },
    [updateScenePosition]
  );
  
  const handleGenerateAll = async () => {
    if (!settings.replicate_api_key) {
      alert('Please add your Replicate API key in settings to generate content');
      return;
    }
    
    if (!storyboardData) return;
    
    setIsGeneratingAll(true);
    
    try {
      // Generate all images first
      await handleGenerateSpecific('images');
      // Then videos
      await handleGenerateSpecific('videos');
      // Then sounds
      await handleGenerateSpecific('sounds');
      
      setGenerationProgress('All content generated successfully!');
      playSounds.ok();
    } catch (error) {
      console.error('Error generating all content:', error);
      playSounds.openOverlay();
      alert(error instanceof Error ? error.message : 'Failed to generate all content');
    } finally {
      setIsGeneratingAll(false);
      setTimeout(() => setGenerationProgress(''), 3000);
    }
  };
  
  const handleGenerateSpecific = async (type: 'images' | 'videos' | 'sounds') => {
    if (!settings.replicate_api_key) {
      alert('Please add your Replicate API key in settings to generate content');
      return;
    }
    
    if (!storyboardData) return;
    
    const scenes = storyboardData.scenes;
    const generationPromises = [];
    
    try {
      for (const scene of scenes) {
        // Skip if already generated or dependencies not met
        if (type === 'images' && scene.image_generated) continue;
        if (type === 'videos' && (scene.video_generated || !scene.generated_image)) continue;
        if (type === 'sounds' && (scene.sound_generated || !scene.generated_video)) continue;
        
        setGeneratingScene(scene.id, true);
        setGenerationProgress(`Generating ${type} for scene ${scenes.indexOf(scene) + 1}/${scenes.length}...`);
        
        const promise = (async () => {
          try {
            type Prediction = {
              id: string;
            };
            let prediction: Prediction;
            let result: string | null = null;
            
            switch (type) {
              case 'images':
                prediction = await generateImage(scene.scene_image_prompt, settings.replicate_api_key);
                result = await pollForPrediction(prediction.id, settings.replicate_api_key);
                if (result) {
                  updateScene(scene.id, {
                    generated_image: result,
                    image_generated: true
                  });
                }
                break;
                
              case 'videos':
                if (scene.generated_image) {
                  prediction = await generateVideo(scene.scene_video_prompt, scene.generated_image, settings.replicate_api_key);
                  result = await pollForPrediction(prediction.id, settings.replicate_api_key);
                  if (result) {
                    updateScene(scene.id, {
                      generated_video: result,
                      video_generated: true
                    });
                  }
                }
                break;
                
              case 'sounds':
                if (scene.generated_video) {
                  prediction = await generateAudio(scene.generated_video, scene.scene_sound_prompt, settings.replicate_api_key);
                  result = await pollForPrediction(prediction.id, settings.replicate_api_key);
                  if (result) {
                    updateScene(scene.id, {
                      generated_sound: result,
                      sound_generated: true
                    });
                  }
                }
                break;
            }
          } catch (error) {
            console.error(`Error generating ${type} for scene ${scene.id}:`, error);
          } finally {
            setGeneratingScene(scene.id, false);
          }
        })();
        generationPromises.push(promise);
      }
      
      await Promise.all(generationPromises);
      
      setGenerationProgress(`Generated all ${type} successfully!`);
      playSounds.ok();
      setTimeout(() => setGenerationProgress(''), 3000);
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      playSounds.openOverlay();
      alert(error instanceof Error ? error.message : `Failed to generate ${type}`);
    }
  };
  
  const handleSave = async () => {
    if (!storyboardData) return;
    
    try {
      setGenerationProgress('Preparing project for download...');
      
      // Get the visual flow sequence instead of original order
      const orderedScenes = getFlowSequence(storyboardData.scenes, edges);
      
      // Update scene IDs to reflect sequence position
      const scenesWithUpdatedIds = orderedScenes.map((scene, index) => ({
        ...scene,
        id: `scene-${index}`
      }));
      
      // Debug logging
      console.log('Original scene order:', storyboardData.scenes.map(s => s.id));
      console.log('Visual flow order:', orderedScenes.map(s => s.id));
      console.log('Updated scene IDs:', scenesWithUpdatedIds.map(s => s.id));
      console.log('Current edges:', edges);
      
      await saveProject(storyboardData, scenesWithUpdatedIds);
      setGenerationProgress('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      playSounds.openOverlay();
      alert(error instanceof Error ? error.message : 'Failed to save project');
    } finally {
      setTimeout(() => setGenerationProgress(''), 3000);
    }
  };
  
  if (!storyboardData) {
    return null;
  }
  
  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Progress Indicator */}
      {generationProgress && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-full text-sm">
          {generationProgress}
        </div>
      )}
      
      {/* Top Navigation - No shadow/border */}
      <div className="bg-white z-10">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Back Button */}
          <button
            onClick={() => {
              playSounds.decide();
              setCurrentView('input');
            }}
            onMouseEnter={() => playSounds.hover()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {/* Generate All Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAll}
              onMouseEnter={() => !isGeneratingAll && playSounds.hover()}
              disabled={isGeneratingAll}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {isGeneratingAll ? 'generating...' : 'generate all'}
            </button>
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1 p-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>
              
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[140px] backdrop-blur-2xl bg-white/5 rounded-lg shadow-xl border border-white/10 p-1 z-50">
                  <DropdownMenu.Item
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => {
                      playSounds.option();
                      handleGenerateSpecific('images');
                    }}
                    onMouseEnter={() => playSounds.hover()}
                  >
                    images
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => {
                      playSounds.option();
                      handleGenerateSpecific('videos');
                    }}
                    onMouseEnter={() => playSounds.hover()}
                  >
                    videos
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => {
                      playSounds.option();
                      handleGenerateSpecific('sounds');
                    }}
                    onMouseEnter={() => playSounds.hover()}
                  >
                    sounds
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                playSounds.ok();
                handleSave();
              }}
              onMouseEnter={() => playSounds.hover()}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              save
            </button>
            
            <button
              onClick={() => {
                playSounds.openOverlay();
                setShowSettingsModal(true);
              }}
              onMouseEnter={() => playSounds.hover()}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              settings
            </button>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
      
      {/* Instructions */}
      <div className="px-8 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          right-click drag to pan view • left-click drag nodes to reposition • connect edges to define sequence • sequence numbers update dynamically • save follows visual flow order
        </p>
      </div>
      
      {/* React Flow Canvas */}
      <div className="flex-1 bg-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgeContextMenu={onEdgeContextMenu}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          onInit={(instance) => instance.fitView()}
          fitViewOptions={{
            padding: 20,
            minZoom: 0.1,
            maxZoom: 2.0,
          }}
          className="bg-white"
          connectionLineStyle={{ 
            stroke: '#ff0000', 
            strokeWidth: 0.3,
            strokeDasharray: '5,5',
          }}
          defaultEdgeOptions={{
            type: 'bezier',
            animated: false,
            style: { 
              stroke: '#000000', 
              strokeWidth: 0.5,
            },
          }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          panOnDrag={[2]}
          selectionOnDrag={true}
          multiSelectionKeyCode="Meta"
          deleteKeyCode="Delete"
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          zoomOnDoubleClick={false}
        >
          <Background color="#f0f0f0" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
      
      {/* Scene Viewer Overlay */}
      <SceneViewerOverlay />
    </div>
  );
}

// Export with provider wrapper
export default function StoryboardView() {
  return (
    <ReactFlowProvider>
      <StoryboardFlow />
    </ReactFlowProvider>
  );
} 