import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Star, Phone, Globe, Clock } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  formatted_phone_number?: string;
  website?: string;
}

export function AuraPlacesFinder({ onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Geolocation error:', error)
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const searchLocation = location.trim() || (userLocation ? `${userLocation.lat},${userLocation.lng}` : 'current location');
      
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(searchLocation)}`);
      const data = await response.json();
      
      if (data.results) {
        setPlaces(data.results);
      }
    } catch (error) {
      console.error('Places search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDirections = (place: Place) => {
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : location;
    const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">Find Places</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 space-y-4 border-b border-slate-800/50">
          <div>
            <label className="block text-sm text-gray-400 mb-2">What are you looking for?</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g., Italian restaurants, coffee shops, gas stations"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Near (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Leave empty to use current location"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-100 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Searching...' : 'Search Places'}
          </button>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 h-[500px]">
          {/* Places List */}
          <div className="overflow-y-auto p-6 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            )}
            
            {!isLoading && places.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Search for places to see results
              </div>
            )}
            
            {places.map((place) => (
              <div
                key={place.place_id}
                onClick={() => setSelectedPlace(place)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPlace?.place_id === place.place_id
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-100">{place.name}</h4>
                  {place.opening_hours?.open_now && (
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Open</span>
                  )}
                </div>
                
                <p className="text-sm text-gray-400 mb-2">{place.vicinity}</p>
                
                {place.rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{place.rating}</span>
                    </div>
                    {place.user_ratings_total && (
                      <span className="text-gray-500">({place.user_ratings_total})</span>
                    )}
                  </div>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    getDirections(place);
                  }}
                  className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="border-l border-slate-800/50 bg-slate-800/20">
            {selectedPlace ? (
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}&query_place_id=${selectedPlace.place_id}`}
              />
            ) : places.length > 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a place to view on map
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Search results will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
