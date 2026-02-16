import React, { useState } from 'react';
import { X, MapPin, Navigation, Route } from 'lucide-react';
import GoogleMaps from './GoogleMaps';

interface AuraMapsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

const AuraMapsDrawer: React.FC<AuraMapsDrawerProps> = ({ isOpen, onClose, apiKey }) => {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location);
  };

  const openInGoogleMaps = () => {
    if (selectedLocation) {
      const url = `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  const getDirections = () => {
    if (selectedLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-2">
            <MapPin className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Aura Maps</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-full">
          {/* Maps Container */}
          <div className="flex-1 p-4">
            <GoogleMaps 
              apiKey={apiKey} 
              onLocationSelect={handleLocationSelect}
            />
          </div>

          {/* Side Panel */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Location Details</h3>
            
            {selectedLocation ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Selected Location</h4>
                      <p className="text-sm text-gray-600 mb-2">{selectedLocation.address}</p>
                      <div className="text-xs text-gray-500">
                        <p>Lat: {selectedLocation.lat.toFixed(6)}</p>
                        <p>Lng: {selectedLocation.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={openInGoogleMaps}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Open in Google Maps</span>
                  </button>
                  
                  <button
                    onClick={getDirections}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>Get Directions</span>
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm">
                      📍 Save to Favorites
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm">
                      📤 Share Location
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm">
                      🏪 Find Nearby Places
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Search for a location to see details</p>
                <p className="text-sm mt-1">Use the search bar above to find places</p>
              </div>
            )}

            {/* Map Features */}
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-3">Map Features</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Real-time address suggestions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>Multiple map views (Satellite, Terrain)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span>Street View integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  <span>3D building visualization</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuraMapsDrawer;