import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Search, Volume2, Minimize2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onMinimize?: () => void;
}

export function AuraMusicPlayer({ onClose, onMinimize }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create player container outside modal
    if (!document.getElementById('youtube-player-container')) {
      const container = document.createElement('div');
      container.id = 'youtube-player-container';
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player';
      container.appendChild(playerDiv);
    }

    // Load YouTube API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    // Initialize player when API is ready
    const initPlayer = () => {
      if ((window as any).YT && document.getElementById('youtube-player')) {
        playerRef.current = new (window as any).YT.Player('youtube-player', {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 1,
            controls: 0
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                handleNext();
              }
              setIsPlaying(event.data === (window as any).YT.PlayerState.PLAYING);
            }
          }
        });
      }
    };

    if ((window as any).YT) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchMusic = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/music/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success && data.videos && data.videos.length > 0) {
        setPlaylist(data.videos);
        setCurrentIndex(0);
        playVideo(data.videos[0].videoId);
      } else {
        alert(data.message || 'No music found. Please check YouTube API key.');
      }
    } catch (error) {
      console.error('Music search failed:', error);
      alert('Music search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const playVideo = (videoId: string) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      playVideo(playlist[nextIndex].videoId);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      playVideo(playlist[prevIndex].videoId);
    }
  };

  const currentSong = playlist[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">Music Player</h3>
          </div>
          <div className="flex items-center gap-2">
            {onMinimize && (
              <button onClick={onMinimize} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                <Minimize2 className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMusic()}
              placeholder="Search for songs..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-green-500 transition-colors"
            />
            <button
              onClick={searchMusic}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Now Playing */}
        {currentSong && (
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center gap-4">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-100 truncate">{currentSong.title}</h4>
                <p className="text-sm text-gray-400 truncate">{currentSong.channel}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-3 rounded-full hover:bg-slate-800/50 transition-colors disabled:opacity-30"
              >
                <SkipBack className="w-6 h-6 text-gray-300" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
              
              <button
                onClick={handleNext}
                disabled={currentIndex === playlist.length - 1}
                className="p-3 rounded-full hover:bg-slate-800/50 transition-colors disabled:opacity-30"
              >
                <SkipForward className="w-6 h-6 text-gray-300" />
              </button>
            </div>
          </div>
        )}

        {/* Playlist */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : playlist.length > 0 ? (
            <div className="space-y-2">
              {playlist.map((song, index) => (
                <div
                  key={song.videoId}
                  onClick={() => {
                    setCurrentIndex(index);
                    playVideo(song.videoId);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    index === currentIndex
                      ? 'bg-green-500/20 border border-green-500/50'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-100 truncate text-sm">{song.title}</h5>
                      <p className="text-xs text-gray-400 truncate">{song.channel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Search for music to start playing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
