import React, { useState, useEffect } from 'react';
import { X, Star, Search, Gamepad2, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Game {
  id: number;
  name: string;
  rating: number;
  released: string;
  background_image: string;
  genres: string;
  platforms: string;
  metacritic?: number;
}

export function AuraGamesDrawer({ onClose }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const genres = ['all', 'action', 'adventure', 'rpg', 'strategy', 'shooter', 'puzzle', 'racing', 'sports'];

  useEffect(() => {
    // Load games immediately when component mounts
    fetchGames();
  }, []);

  useEffect(() => {
    // Debounce search and genre changes
    const timeoutId = setTimeout(() => {
      fetchGames();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [selectedGenre, searchQuery]);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching games with:', { searchQuery, selectedGenre });
      
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'games',
          input: { 
            search: searchQuery || '',
            genre: selectedGenre !== 'all' ? selectedGenre : ''
          }
        })
      });

      const data = await response.json();
      console.log('Games response:', data);
      
      if (data.success && Array.isArray(data.data)) {
        setGames(data.data);
      } else {
        console.error('Games API failed:', data);
        setGames([]);
      }
    } catch (error) {
      console.error('Games fetch error:', error);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openGameLink = (gameName: string) => {
    const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}`;
    window.open(searchUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">Games Library</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-slate-800/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedGenre === genre
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                }`}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Games Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="group bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50 hover:border-purple-500/50 transition-all cursor-pointer"
                  onClick={() => openGameLink(game.name)}
                >
                  {game.background_image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={game.background_image}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-100 text-sm line-clamp-2 flex-1">
                        {game.name}
                      </h4>
                      <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span>{game.rating}/5</span>
                        {game.metacritic && (
                          <span className="ml-auto bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                            {game.metacritic}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-purple-400">Genre:</span> {game.genres}
                      </div>
                      
                      <div>
                        <span className="text-blue-400">Platforms:</span> {game.platforms}
                      </div>
                      
                      {game.released && (
                        <div>
                          <span className="text-gray-500">Released:</span> {new Date(game.released).getFullYear()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!isLoading && games.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No games found. Try a different search or genre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}