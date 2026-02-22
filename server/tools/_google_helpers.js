export function requireGoogleKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok:false, error:"GOOGLE_MAPS_API_KEY missing on server. Set it in Render env vars." };
  return { ok:true, key };
}

export function googleHint(status, msg="") {
  if (status === "REQUEST_DENIED") return "Google denied the request. Causes: billing not enabled, API not enabled, or API key restrictions (referrer/IP). Check Google Cloud Console.";
  if (status === "OVER_QUERY_LIMIT") return "Quota exceeded. Check Google API quotas and billing.";
  if (status === "INVALID_REQUEST") return "Invalid request to Google (missing or malformed parameters).";
  if (status === "ZERO_RESULTS") return "No results found. Try a more specific address (include city/state).";
  return msg || "Unknown Google API error.";
}

export function failGoogle(step, data, httpStatus=null) {
  const status = data?.status || data?.error?.status || "UNKNOWN";
  const message = data?.error_message || data?.error?.message || null;
  console.log(`[google] ${step} error:`, status, message || "");
  return {
    success:false,
    error: `${step} failed: ${status}`,
    details: {
      step,
      httpStatus,
      googleStatus: status,
      googleErrorMessage: message,
      hint: googleHint(status, message || "")
    }
  };
}

export async function fetchJsonSafe(res) {
  const text = await res.text();
  try { return { ok:true, json: JSON.parse(text) }; }
  catch { return { ok:false, text }; }
}

export async function geocodeAddress(address, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const parsed = await fetchJsonSafe(res);
  if (!parsed.ok) {
    return { success:false, error:"geocoding failed: non-json response", details:{ httpStatus: res.status, bodyPreview: parsed.text.slice(0,200)} };
  }

  const data = parsed.json;
  if (data.status !== "OK") return failGoogle("geocoding", data, res.status);

  const top = data.results?.[0];
  if (!top) return { success:false, error:"geocoding failed: no results" };

  return {
    success:true,
    formattedAddress: top.formatted_address,
    location: top.geometry.location
  };
}
