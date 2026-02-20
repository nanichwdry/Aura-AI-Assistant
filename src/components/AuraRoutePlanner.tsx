import React, { useState, useRef, useEffect } from 'react';
import { X, Navigation, Clock, DollarSign, MapPin } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface RouteData {
  durationSec: number;
  staticDurationSec?: number;
  delaySec?: number | null;
  distanceMeters: number;
  toll: { currency: string; amount: number } | null;
  hasTolls: boolean;
  tollNote?: string;
  summary: string;
}

interface RouteResult {
  origin: string;
  destination: string;
  best: RouteData;
  noTolls: RouteData;
  alternatives?: RouteData[];
  recommendation: {
    choice: 'best' | 'noTolls';
    reason: string;
  };
  trafficAware?: boolean;
  departureTime?: string;
}

export function AuraRoutePlanner({ onClose }: Props) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [preference, setPreference] = useState<'fastest' | 'cheapest' | 'avoid_tolls'>('fastest');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}hr ${minutes}mins` : `${hours}hr`;
    }
    return `${minutes}mins`;
  };

  const formatDistance = (meters: number) => {
    const miles = (meters * 0.000621371).toFixed(1);
    return `${miles} mi`;
  };

  const getAddressSuggestions = async (input: string) => {
    if (input.length < 3) return [];
    
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error('Address suggestions error:', error);
      return [];
    }
  };

  const handleOriginChange = async (value: string) => {
    setOrigin(value);
    if (value.length >= 3) {
      const suggestions = await getAddressSuggestions(value);
      setOriginSuggestions(suggestions);
      setShowOriginSuggestions(true);
    } else {
      setShowOriginSuggestions(false);
    }
  };

  const handleDestinationChange = async (value: string) => {
    setDestination(value);
    if (value.length >= 3) {
      const suggestions = await getAddressSuggestions(value);
      setDestinationSuggestions(suggestions);
      setShowDestinationSuggestions(true);
    } else {
      setShowDestinationSuggestions(false);
    }
  };

  const selectOriginSuggestion = (suggestion: any) => {
    setOrigin(suggestion.description);
    setShowOriginSuggestions(false);
  };

  const selectDestinationSuggestion = (suggestion: any) => {
    setDestination(suggestion.description);
    setShowDestinationSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setShowDestinationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFindRoute = async () => {
    if (!origin.trim() || !destination.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        tool: 'route_planner',
        input: {
          origin: origin.trim(),
          destination: destination.trim(),
          preference
        }
      };
      
      console.log('Request payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(data, null, 2));

      if (!response.ok || !data.success) {
        setError(data.error || `Request failed (${response.status})`);
        setIsLoading(false);
        return;
      }

      setResult(data.data);
    } catch (err: any) {
      console.error('Route error:', err);
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRouteCard = (route: RouteData | null, title: string, isRecommended: boolean) => {
    if (!route) return null;
    
    return (
      <div className={`p-4 rounded-xl border ${isRecommended ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700/50 bg-slate-800/30'} transition-all`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-100">{title}</h4>
          {isRecommended && (
            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Recommended</span>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>
              ETA: {formatDuration(route.durationSec)}
              {route.delaySec && route.delaySec > 0 && (
                <span className="text-orange-400 ml-1">
                  (+{Math.round(route.delaySec / 60)}mins delay)
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <Navigation className="w-4 h-4 text-purple-400" />
            <span>Distance: {formatDistance(route.distanceMeters)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span>
              Tolls: {
                route.toll 
                  ? `$${route.toll.amount.toFixed(2)}`
                  : route.tollNote || (route.hasTolls 
                    ? 'may apply (price unavailable)'
                    : 'none')
              }
            </span>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">{route.summary}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">Route Planner</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-4 border-b border-slate-800/50">
          <div className="relative" ref={originRef}>
            <label className="block text-sm text-gray-400 mb-2">Origin</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => handleOriginChange(e.target.value)}
              placeholder="Enter address, city, or place"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-blue-500 transition-colors"
            />
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                {originSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id}
                    onClick={() => selectOriginSuggestion(suggestion)}
                    className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-100">{suggestion.structured_formatting?.main_text}</div>
                      <div className="text-xs text-gray-400">{suggestion.structured_formatting?.secondary_text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative" ref={destinationRef}>
            <label className="block text-sm text-gray-400 mb-2">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              placeholder="Enter address, city, or place"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-blue-500 transition-colors"
            />
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                {destinationSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id}
                    onClick={() => selectDestinationSuggestion(suggestion)}
                    className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-100">{suggestion.structured_formatting?.main_text}</div>
                      <div className="text-xs text-gray-400">{suggestion.structured_formatting?.secondary_text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Preference</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="fastest">Fastest</option>
              <option value="cheapest">Cheapest</option>
              <option value="avoid_tolls">Avoid Tolls</option>
            </select>
          </div>
          
          <button
            onClick={handleFindRoute}
            disabled={!origin.trim() || !destination.trim() || isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Finding Routes...' : 'Find Route'}
          </button>
        </div>

        {/* Results */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-400 text-center">
              {error}
            </div>
          )}
          
          {result && result.best && result.noTolls && (
            <div className="space-y-4">
              {/* Traffic Status */}
              {result.trafficAware && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-xs text-green-400 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live traffic data included
                  </p>
                </div>
              )}
              
              {/* Recommendation Banner */}
              {result.recommendation && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-300">
                    <strong>Recommended:</strong> {result.recommendation.choice === 'best' ? 'Best Route' : 'No Tolls Route'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{result.recommendation.reason}</p>
                </div>
              )}
              
              {/* Route Cards */}
              <div className="grid gap-4">
                {renderRouteCard(result.best, 'Best Route (Traffic-Aware)', result.recommendation?.choice === 'best')}
                {renderRouteCard(result.noTolls, 'No Tolls Route', result.recommendation?.choice === 'noTolls')}
                
                {/* Alternative Routes */}
                {result.alternatives && result.alternatives.length > 2 && (
                  <div className="mt-4">
                    <h5 className="text-sm text-gray-400 mb-2">Alternative Routes</h5>
                    <div className="space-y-2">
                      {result.alternatives.slice(2, 4).map((alt, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-300">{alt.summary}</span>
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>{formatDuration(alt.durationSec)}</span>
                              <span>{formatDistance(alt.distanceMeters)}</span>
                              <span>{alt.toll ? `$${alt.toll.amount.toFixed(2)}` : 'No tolls'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!isLoading && !error && !result && (
            <div className="text-center py-12 text-gray-400">
              Enter origin and destination to find routes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
