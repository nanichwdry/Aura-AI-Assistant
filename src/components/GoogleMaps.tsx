import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Satellite, Map, Navigation } from 'lucide-react';

interface GoogleMapsProps {
  apiKey: string;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
}

const GoogleMaps: React.FC<GoogleMapsProps> = ({ apiKey, onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      if (!apiKey) {
        console.error('Google Maps API key not provided');
        setIsLoading(false);
        return;
      }

      try {
        // Load Google Maps script only once
        if (!window.google) {
          // Check if script is already being loaded
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
            script.async = true;
            script.defer = true;
            
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          } else {
            // Wait for existing script to load
            await new Promise((resolve) => {
              const checkGoogle = () => {
                if (window.google) resolve(true);
                else setTimeout(checkGoogle, 100);
              };
              checkGoogle();
            });
          }
        }

        console.log('Google Maps API loaded successfully');

        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.0060 }, // NYC default
            zoom: 13,
            mapTypeId: mapType,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
              }
            ]
          });

          setMap(mapInstance);

          // Initialize autocomplete
          if (autocompleteRef.current) {
            const autocompleteInstance = new google.maps.places.Autocomplete(
              autocompleteRef.current,
              {
                types: ['address', 'establishment'],
                fields: ['place_id', 'geometry', 'name', 'formatted_address']
              }
            );

            autocompleteInstance.addListener('place_changed', () => {
              const place = autocompleteInstance.getPlace();
              if (place.geometry?.location) {
                const location = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  address: place.formatted_address || place.name || ''
                };

                mapInstance.setCenter(location);
                mapInstance.setZoom(17);

                // Add marker
                new google.maps.Marker({
                  position: location,
                  map: mapInstance,
                  title: location.address,
                  animation: google.maps.Animation.DROP
                });

                setSearchValue(location.address);
                setSuggestions([]);
                onLocationSelect?.(location);
              }
            });

            setAutocomplete(autocompleteInstance);
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setIsLoading(false);
      }
    };

    if (apiKey) {
      initMap();
    } else {
      console.error('Google Maps API key is missing');
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType);
    }
  }, [map, mapType]);

  const handleSearchChange = async (value: string) => {
    setSearchValue(value);
    
    if (value.length > 2 && window.google) {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
          types: ['address', 'establishment']
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.slice(0, 5));
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: google.maps.places.AutocompletePrediction) => {
    if (!map) return;

    const service = new google.maps.places.PlacesService(map);
    service.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['geometry', 'formatted_address', 'name']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || place.name || ''
          };

          map.setCenter(location);
          map.setZoom(17);

          new google.maps.Marker({
            position: location,
            map: map,
            title: location.address,
            animation: google.maps.Animation.DROP
          });

          setSearchValue(location.address);
          setSuggestions([]);
          onLocationSelect?.(location);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Maps...</p>
          {!apiKey && <p className="text-red-500 text-sm mt-2">API key missing</p>}
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 mb-2">Google Maps API key not configured</p>
          <p className="text-gray-600 text-sm">Please add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Search Bar */}
      <div className="p-4 border-b bg-gray-50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={autocompleteRef}
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              handleSearchChange(e.target.value);
            }}
            placeholder="Search for places, addresses..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.structured_formatting.main_text}
                      </div>
                      <div className="text-xs text-gray-500">
                        {suggestion.structured_formatting.secondary_text}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex space-x-1">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-1 text-xs rounded ${mapType === 'roadmap' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Map className="h-3 w-3 inline mr-1" />
            Map
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 text-xs rounded ${mapType === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Satellite className="h-3 w-3 inline mr-1" />
            Satellite
          </button>
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-3 py-1 text-xs rounded ${mapType === 'hybrid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Navigation className="h-3 w-3 inline mr-1" />
            Hybrid
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1 text-xs rounded ${mapType === 'terrain' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Terrain
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 min-h-96" />
    </div>
  );
};

export default GoogleMaps;