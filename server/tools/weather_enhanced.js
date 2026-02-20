const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getCoordinates(city) {
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${GOOGLE_API_KEY}`);
  const data = await res.json();
  if (data.results?.[0]) {
    return data.results[0].geometry.location;
  }
  return null;
}

export async function weather_enhanced(input) {
  try {
    const city = input.city || 'Frederick';
    const coords = await getCoordinates(city);
    
    if (!coords) {
      return { success: false, error: 'City not found' };
    }

    const [weatherRes, airQualityRes, pollenRes] = await Promise.all([
      fetch(`https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}&location.latitude=${coords.lat}&location.longitude=${coords.lng}&languageCode=en`),
      fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: { latitude: coords.lat, longitude: coords.lng } })
      }),
      fetch(`https://pollen.googleapis.com/v1/forecast:lookup?key=${GOOGLE_API_KEY}&location.latitude=${coords.lat}&location.longitude=${coords.lng}&days=1`)
    ]);

    const weather = await weatherRes.json();
    const airQuality = await airQualityRes.json();
    const pollen = await pollenRes.json();

    return {
      success: true,
      data: {
        city,
        coordinates: coords,
        weather: {
          temp: weather.temperature?.value,
          feelsLike: weather.apparentTemperature?.value,
          humidity: weather.humidity?.value,
          description: weather.weatherCode,
          icon: weather.weatherCode
        },
        airQuality: {
          aqi: airQuality.indexes?.[0]?.aqi,
          category: airQuality.indexes?.[0]?.category,
          dominantPollutant: airQuality.indexes?.[0]?.dominantPollutant
        },
        pollen: {
          tree: pollen.dailyInfo?.[0]?.pollenTypeInfo?.find(p => p.code === 'TREE')?.indexInfo?.category,
          grass: pollen.dailyInfo?.[0]?.pollenTypeInfo?.find(p => p.code === 'GRASS')?.indexInfo?.category,
          weed: pollen.dailyInfo?.[0]?.pollenTypeInfo?.find(p => p.code === 'WEED')?.indexInfo?.category
        }
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const weather_enhanced_schema = {
  name: 'weather_enhanced',
  description: 'Get weather, air quality, and pollen data for any city',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name', default: 'Frederick' }
    }
  }
};
