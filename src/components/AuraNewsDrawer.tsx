import React, { useState, useEffect } from 'react';
import { X, Newspaper, Globe, Languages, MapPin, Filter, ExternalLink, Calendar } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface Props {
  onClose: () => void;
}

interface NewsArticle {
  title: string;
  description: string;
  source: { name: string };
  url: string;
  publishedAt: string;
  urlToImage?: string;
  author?: string;
}

const COUNTRIES = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'cn', name: 'China', flag: '🇨🇳' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'ru', name: 'Russia', flag: '🇷🇺' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ae', name: 'UAE', flag: '🇦🇪' },
  { code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'za', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ng', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' }
];

const CATEGORIES = [
  { id: 'general', name: 'General', icon: '📰' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'health', name: 'Health', icon: '🏥' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' }
];

export function AuraNewsDrawer({ onClose }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [country, setCountry] = useState('us');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/news/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          language,
          category,
          query: searchQuery.trim() || undefined
        })
      });

      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Backend not responding');
      }

      const result = JSON.parse(text);
      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch news');
      }

      setArticles(result.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load news');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [country, language, category]);

  const handleSearch = () => {
    fetchNews();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <img src="/Aura AI logo.png" alt="Aura Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Global News
              </h1>
              <p className="text-sm text-zinc-400">Real-time news from around the world</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="p-4 border-b border-slate-800/50 space-y-3 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search news..."
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-gray-300 placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all ${showFilters ? 'bg-cyan-600 text-white' : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300 outline-none focus:border-cyan-500"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Languages className="w-4 h-4" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300 outline-none focus:border-cyan-500"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Newspaper className="w-4 h-4" />
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300 outline-none focus:border-cyan-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Loading news...</p>
              </div>
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((article, i) => (
                <div
                  key={i}
                  onClick={() => window.open(article.url, '_blank')}
                  className="group p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-cyan-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  {article.urlToImage && (
                    <img
                      src={article.urlToImage}
                      alt={article.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <h3 className="font-semibold text-gray-200 mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-3">
                    {article.description || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Newspaper className="w-3 h-3" />
                      {article.source.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" />
                    Read more
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No news articles found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
