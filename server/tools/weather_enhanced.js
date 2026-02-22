import { requireGoogleKey, geocodeAddress, fetchJsonSafe, failGoogle } from "./_google_helpers.js";

export async function weather_enhanced(input) {
  try {
    const city = input?.city || "Frederick";

    const keyCheck = requireGoogleKey();
    if (!keyCheck.ok) return { success:false, error:keyCheck.error };
    const apiKey = keyCheck.key;

    const geo = await geocodeAddress(city, apiKey);
    if (!geo.success) return geo;

    const { lat, lng } = geo.location;

    // Use OpenWeather as fallback since Google Weather API requires special access
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    const w = await fetchJsonSafe(weatherRes);
    if (!w.ok) return { success:false, error:"Weather API failed: non-json response", details:{ httpStatus: weatherRes.status } };
    if (!weatherRes.ok) return { success:false, error:"Weather API failed", details:{ httpStatus: weatherRes.status, data: w.json } };

    const [airRes, pollenRes] = await Promise.all([
      fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ location:{ latitude: lat, longitude: lng } })
      }),
      fetch(`https://pollen.googleapis.com/v1/forecast:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&days=1`)
    ]);

    const a = await fetchJsonSafe(airRes);
    const p = await fetchJsonSafe(pollenRes);

    const weather = w.json;
    const airQuality = airRes.ok && a.ok ? a.json : null;
    const pollen = pollenRes.ok && p.ok ? p.json : null;

    return {
      success:true,
      data:{
        name: geo.formattedAddress.split(',')[0],
        main: {
          temp: weather.main?.temp ?? 0,
          feels_like: weather.main?.feels_like ?? 0,
          humidity: weather.main?.humidity ?? 0
        },
        weather: weather.weather || [{ description: 'N/A' }],
        wind: { speed: weather.wind?.speed ?? 0 },
        airQuality: airQuality ? {
          indexes: airQuality.indexes || [],
          pollutants: airQuality.pollutants || []
        } : null,
        pollen: pollen ? {
          dailyInfo: pollen.dailyInfo || []
        } : null
      }
    };
  } catch (e) {
    console.log("[weather_enhanced] unexpected error:", e?.message || e);
    return { success:false, error: e?.message || "weather_enhanced failed" };
  }
}
