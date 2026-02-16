import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Palette, Brush, Eraser, Undo, Redo, Download, Wand2, Sparkles, Image, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Sketch {
  id: string;
  title: string;
  dataUrl: string;
  created: string;
  updated: string;
}

export function AuraSketchpadDrawer({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState('#ffffff');
  const [lastPoint, setLastPoint] = useState<{x: number, y: number} | null>(null);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [currentSketch, setCurrentSketch] = useState<Sketch | null>(null);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ffc0cb', '#a52a2a', '#808080', '#90ee90', '#87ceeb'
  ];

  useEffect(() => {
    loadSketches();
    initCanvas();
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Set dark background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const loadSketches = async () => {
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'sketchpad',
          input: { action: 'list' }
        })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSketches(data.data);
      }
    } catch (error) {
      console.error('Failed to load sketches:', error);
    }
  };

  const saveSketch = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    const sketchData = {
      id: currentSketch?.id || Date.now().toString(),
      title: title.trim() || 'Untitled Sketch',
      dataUrl,
      created: currentSketch?.created || new Date().toISOString(),
      updated: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'sketchpad',
          input: { action: 'save', sketch: sketchData }
        })
      });
      
      if (response.ok) {
        setCurrentSketch(sketchData);
        loadSketches();
      }
    } catch (error) {
      console.error('Failed to save sketch:', error);
    }
  };

  const deleteSketch = async (sketchId: string) => {
    try {
      await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'sketchpad',
          input: { action: 'delete', id: sketchId }
        })
      });
      
      if (currentSketch?.id === sketchId) {
        newSketch();
      }
      loadSketches();
    } catch (error) {
      console.error('Failed to delete sketch:', error);
    }
  };

  const generateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'sketchpad',
          input: { 
            action: 'ai_generate',
            prompt: aiPrompt
          }
        })
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        // Load AI generated image onto canvas
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = data.data;
        setShowAiPanel(false);
        setAiPrompt('');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPoint(pos);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !lastPoint) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const currentPoint = getMousePos(e);
    
    // Smooth line using quadratic curves
    const midPoint = {
      x: (lastPoint.x + currentPoint.x) / 2,
      y: (lastPoint.y + currentPoint.y) / 2
    };
    
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    ctx.stroke();
    
    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPoint(null);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadSketch = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${title || 'sketch'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const newSketch = () => {
    setCurrentSketch(null);
    setTitle('');
    clearCanvas();
  };

  const openSketch = (sketch: Sketch) => {
    setCurrentSketch(sketch);
    setTitle(sketch.title);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const img = document.createElement('img');
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = sketch.dataUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500">
              <Brush className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">AI Sketchpad</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newSketch}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="New Sketch"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={saveSketch}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="Save Sketch"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={downloadSketch}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(95vh-80px)]">
          {/* Sketches Sidebar */}
          <div className="w-80 border-r border-slate-800/50 bg-slate-800/20 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Your Sketches</h4>
              <div className="space-y-2">
                {sketches.map((sketch) => (
                  <div
                    key={sketch.id}
                    onClick={() => openSketch(sketch)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                      currentSketch?.id === sketch.id 
                        ? 'bg-fuchsia-500/20 border border-fuchsia-500/30' 
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <img 
                          src={sketch.dataUrl} 
                          alt={sketch.title}
                          className="w-full h-20 object-cover rounded mb-2 bg-slate-800"
                        />
                        <h5 className="font-medium text-gray-100 text-sm truncate">{sketch.title}</h5>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(sketch.updated).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSketch(sketch.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all ml-2"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {sketches.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brush className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sketches yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Title Input */}
            <div className="p-4 border-b border-slate-800/50">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sketch title..."
                className="w-full bg-transparent text-xl font-semibold text-gray-100 placeholder-gray-500 outline-none"
              />
            </div>

            {/* Tools */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-800/10">
              <div className="flex items-center gap-4">
                {/* Drawing Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTool('brush')}
                    className={`p-2 rounded-lg transition-colors ${
                      tool === 'brush' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-400 hover:bg-slate-700/50'
                    }`}
                  >
                    <Brush className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-lg transition-colors ${
                      tool === 'eraser' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-400 hover:bg-slate-700/50'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>

                {/* Brush Size */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-gray-400 w-6">{brushSize}</span>
                </div>

                {/* Colors */}
                <div className="flex items-center gap-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        color === c ? 'border-white scale-110' : 'border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* AI Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm"
                >
                  <Wand2 className="w-4 h-4" />
                  AI Generate
                </button>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* AI Panel */}
            {showAiPanel && (
              <div className="p-4 border-b border-slate-800/50 bg-purple-500/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to generate..."
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-gray-100 placeholder-gray-500 outline-none focus:border-purple-500"
                    onKeyPress={(e) => e.key === 'Enter' && generateAiImage()}
                  />
                  <button
                    onClick={generateAiImage}
                    disabled={isLoading || !aiPrompt.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* Canvas */}
            <div className="flex-1 p-4 bg-slate-900/50">
              <div className="w-full h-full flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousedown', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    startDrawing(mouseEvent as any);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousemove', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    draw(mouseEvent as any);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopDrawing();
                  }}
                  className="border border-slate-700/50 rounded-lg cursor-crosshair shadow-2xl touch-none"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}