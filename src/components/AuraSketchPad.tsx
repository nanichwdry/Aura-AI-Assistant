import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Trash2, Sparkles } from 'lucide-react';
import { generateSketch } from '../services/sketchApi';

interface Props {
  onClose: () => void;
}

export function AuraSketchPad({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setBackgroundImage(null);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `aura-sketch-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');

    try {
      const base64 = await generateSketch(prompt);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setBackgroundImage(img);
      };
      img.src = `data:image/png;base64,${base64}`;
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <img src="/Aura AI logo.png" alt="Aura Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-white">Sketchpad</h1>
              <p className="text-sm text-zinc-400">Draw or generate AI sketches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="p-4 border-b border-slate-800/50 flex items-center gap-3 flex-wrap bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-full">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe what to sketch..."
              maxLength={300}
              disabled={generating}
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-gray-300 placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          <button
            onClick={clearCanvas}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Clear"
          >
            <Trash2 className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="border border-slate-700/50 rounded-xl shadow-2xl cursor-crosshair bg-white"
          />
        </div>
      </div>
    </div>
  );
}
