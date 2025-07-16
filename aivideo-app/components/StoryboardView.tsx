'use client';

import { useCallback, useMemo, useState } from 'react';
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

// Custom node component for storyboard scene cards
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SceneNode({ data }: any) {
  const { scene } = data;
  const hasMedia = scene.generated_image || scene.generated_video;
  const { setEditingSceneId } = useAppStore();
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSceneId(scene.id);
  };
  
  return (
    <div className="relative">
      {/* Before node (input/target) - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="before"
        className="bg-transparent border-none hover:scale-110 transition-transform"
        style={{ left: -20, width: 'auto', height: 'auto', background: 'none' }}
        title="Connect to previous scene"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="fill-black hover:fill-gray-700 transition-colors">
          <path d="M2 2L14 8L2 14V2Z" />
        </svg>
      </Handle>
      
      {/* Scene card */}
      <div 
        className="w-48 h-48 rounded-full bg-transparent transition-all cursor-move overflow-hidden relative group"
        style={{
          backgroundImage: hasMedia ? `url(${scene.generated_image || scene.generated_video})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onDoubleClick={handleDoubleClick}
        title="Double-click to edit scene"
      >
        {/* Blur overlay if there's a background image */}
        {hasMedia && (
          <div className="absolute inset-0 backdrop-blur-md bg-white/70" />
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

function StoryboardFlow() {
  const { storyboardData, setCurrentView, updateScenePosition } = useAppStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { fitView } = useReactFlow();
  
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
        data: { scene },
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


  
  // Update nodes when storyboard data changes
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  
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
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  // Handle edge click (select and delete with Delete key)
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Double-click to delete edge
      if (event.detail === 2) {
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
  
  const handleGenerateAll = () => {
    console.log('Generating all content for all scenes...');
    alert('Generate All functionality will be implemented with API integration');
  };
  
  const handleGenerateSpecific = (type: 'images' | 'videos' | 'sounds') => {
    console.log('Generate all:', type);
    alert(`Generate All ${type} functionality will be implemented with API integration`);
  };
  
  const handleSave = () => {
    console.log('Save project');
    alert('Save functionality will be implemented');
  };
  
  if (!storyboardData) {
    return null;
  }
  
  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Top Navigation - No shadow/border */}
      <div className="bg-white z-10">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Back Button */}
          <button
            onClick={() => setCurrentView('input')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          {/* Generate All Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAll}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Generate All
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
                    onClick={() => handleGenerateSpecific('images')}
                  >
                    Images
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => handleGenerateSpecific('videos')}
                  >
                    Videos
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => handleGenerateSpecific('sounds')}
                  >
                    Sounds
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleSave}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Save
            </button>
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Settings
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
          Double-click any scene to edit its content • Drag to reposition • Right-click edges to disconnect
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