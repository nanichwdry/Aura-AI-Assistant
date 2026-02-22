import { requireGoogleKey, geocodeAddress, fetchJsonSafe, failGoogle } from "./_google_helpers.js";

function safeDepartureTimeISO(inputDepartureTime) {
  const now = Date.now();
  const minFuture = new Date(now + 600_000); // now + 10 minutes for maximum safety

  // Default: future timestamp
  if (!inputDepartureTime || inputDepartureTime === "now") {
    return minFuture.toISOString();
  }

  // Parse user-provided time
  const parsed = new Date(inputDepartureTime);
  if (Number.isNaN(parsed.getTime())) {
    return minFuture.toISOString();
  }

  // Clamp past/too-soon values
  if (parsed.getTime() < minFuture.getTime()) {
    return minFuture.toISOString();
  }

  return parsed.toISOString();
}

function parseDurationSec(d) {
  if (!d) return null;
  const s = String(d);
  return s.endsWith("s") ? parseInt(s.slice(0, -1), 10) : parseInt(s, 10);
}

function moneyToNumber(m) {
  if (!m) return null;
  const units = Number(m.units || 0);
  const nanos = Number(m.nanos || 0);
  return units + nanos / 1e9;
}

function formatKm(meters) {
  if (meters == null) return null;
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

function formatMiles(meters) {
  if (meters == null) return null;
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(sec) {
  if (sec == null) return null;
  const hours = Math.floor(sec / 3600);
  const mins = Math.round((sec % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDelay(sec) {
  if (sec == null || sec === 0) return "None";
  const mins = Math.round(sec / 60);
  return `+${mins}m`;
}

function buildFlags(route) {
  const flags = [];

  if (route.delaySec >= 900) {
    flags.push({
      type: "TRAFFIC_SPIKE",
      severity: "warning",
      message: `Heavy traffic adds ${formatDelay(route.delaySec)}`
    });
  }

  if (route.toll && route.toll.amount >= 10) {
    flags.push({
      type: "HIGH_TOLL",
      severity: "info",
      message: `High toll: $${route.toll.amount.toFixed(2)}`
    });
  }

  if (route.hasTolls && !route.toll) {
    flags.push({
      type: "TOLL_UNKNOWN",
      severity: "warning",
      message: "Tolls may apply (price unavailable)"
    });
  }

  return flags;
}

function normalizeRoute(route) {
  const durationSec = parseDurationSec(route.duration);
  const staticDurationSec = parseDurationSec(route.staticDuration);
  const delaySec =
    durationSec != null && staticDurationSec != null
      ? Math.max(0, durationSec - staticDurationSec)
      : null;

  const tollInfo = route.travelAdvisory?.tollInfo;
  const est = tollInfo?.estimatedPrice?.[0];

  const hasTolls = Boolean(tollInfo);
  const tollAmount = est ? moneyToNumber(est) : null;
  const tollCurrency = est?.currencyCode || null;

  const normalized = {
    // raw
    distanceMeters: route.distanceMeters ?? null,
    durationSec,
    staticDurationSec,
    delaySec,

    // formatted
    distanceText: formatKm(route.distanceMeters ?? null),
    distanceMilesText: formatMiles(route.distanceMeters ?? null),
    durationText: formatDuration(durationSec),
    delayText: formatDelay(delaySec),

    // tolls (truthful)
    hasTolls,
    toll: tollAmount != null && tollCurrency
      ? { amount: tollAmount, currency: tollCurrency }
      : null,
    tollNote: hasTolls && !est ? "Tolls may apply (price unavailable)" : null,

    // metadata
    description: route.description || "",
  };

  normalized.flags = buildFlags(normalized);

  return normalized;
}

function buildRecommendation(standardRoutes, noTollsRoutes) {
  const standard = standardRoutes[0];
  const noTolls = noTollsRoutes[0];

  if (!standard && !noTolls) {
    return { choice: null, reason: "No routes available" };
  }

  if (!standard) {
    return { choice: "noTolls", reason: "Only route available" };
  }

  if (!noTolls) {
    return { choice: "standard", reason: "Only route available" };
  }

  const timeSavings = (noTolls.durationSec || 0) - (standard.durationSec || 0);
  const tollCost = standard.toll?.amount || 0;

  // Handle unknown toll price
  if (standard.hasTolls && !standard.toll) {
    if (timeSavings > 600) {
      return { choice: "standard", reason: `Saves ${formatDuration(timeSavings)} but tolls apply (price unknown)` };
    }
    return { choice: "noTolls", reason: "Avoids tolls (price unknown) with similar travel time" };
  }

  // Handle small time differences (<5m)
  if (Math.abs(timeSavings) < 300) {
    if (standard.hasTolls && tollCost > 0) {
      return { choice: "noTolls", reason: `Avoids $${tollCost.toFixed(2)} toll with similar travel time` };
    }
    return { choice: "standard", reason: "Similar travel time, no tolls" };
  }

  // Handle traffic spikes
  if (standard.delaySec >= 900) {
    return { choice: "standard", reason: `Fastest despite heavy traffic (${standard.delayText} delay)` };
  }

  // Cost/time tradeoff
  if (standard.hasTolls && tollCost > 0) {
    if (timeSavings > 600) {
      return { choice: "standard", reason: `Saves ${formatDuration(timeSavings)} for $${tollCost.toFixed(2)} toll` };
    }
    return { choice: "noTolls", reason: `Avoids $${tollCost.toFixed(2)} toll (only ${formatDuration(timeSavings)} slower)` };
  }

  return { choice: "standard", reason: "Fastest route" };
}

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

export async function planRoute({ origin, destination, preference = 'fastest', departureTime }) {
  try {
    // Validate API key first
    const keyCheck = requireGoogleKey();
    if (!keyCheck.ok) return { success: false, error: keyCheck.error };
    const apiKey = keyCheck.key;

    console.log('[route_planner] Request:', { origin, destination, apiKey: apiKey.substring(0, 10) + '...' });

    const departureTimeISO = safeDepartureTimeISO(departureTime);
    console.log('[route_planner] using routes v2 computeRoutes', departureTimeISO);

    // Fetch standard routes with alternatives
    const standardBody = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
      extraComputations: ["TOLLS"],
      departureTime: departureTimeISO,
    };

    const standardResponse = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters,routes.description,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify(standardBody),
    });

    const normalParsed = await fetchJsonSafe(standardResponse);
    if (!normalParsed.ok) {
      return {
        success: false,
        error: "routes failed: non-json response",
        details: { httpStatus: standardResponse.status, bodyPreview: normalParsed.text.slice(0, 200) }
      };
    }
    const normalJson = normalParsed.json;
    
    console.log('[route_planner] Response status:', standardResponse.status);
    console.log('[route_planner] Response:', JSON.stringify(normalJson).substring(0, 500));
    
    // Check for API error with detailed handling
    if (!standardResponse.ok || normalJson.error) {
      return failGoogle("routes", normalJson, standardResponse.status);
    }

    // Fetch no-tolls routes with alternatives
    const noTollsBody = {
      ...standardBody,
      routeModifiers: { avoidTolls: true },
    };

    const noTollsResponse = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters,routes.description,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify(noTollsBody),
    });

    const noTollParsed = await fetchJsonSafe(noTollsResponse);
    if (!noTollParsed.ok) {
      return {
        success: false,
        error: "routes_no_tolls failed: non-json response",
        details: { httpStatus: noTollsResponse.status, bodyPreview: noTollParsed.text.slice(0, 200) }
      };
    }
    const noTollJson = noTollParsed.json;
    
    // Check for API error
    if (!noTollsResponse.ok || noTollJson.error) {
      return failGoogle("routes_no_tolls", noTollJson, noTollsResponse.status);
    }

    // Normalize top 2 routes from each
    const standardRoutes = (normalJson?.routes || []).slice(0, 2).map(normalizeRoute);
    const noTollsRoutes = (noTollJson?.routes || []).slice(0, 2).map(normalizeRoute);

    if (standardRoutes.length === 0 && noTollsRoutes.length === 0) {
      return { success: false, error: "No route found", details: { hint: "Check if addresses are valid and accessible by car" } };
    }

    const recommendation = buildRecommendation(standardRoutes, noTollsRoutes);

    return {
      success: true,
      data: {
        origin,
        destination,
        departureTime: departureTimeISO,
        routes: {
          standard: standardRoutes,
          noTolls: noTollsRoutes,
        },
        recommendation,
      },
    };
  } catch (error) {
    console.error('[route_planner] Exception:', error);
    return {
      success: false,
      error: error.message || 'Route planning failed',
      details: { hint: 'Unexpected error. Check server logs.' }
    };
  }
}
