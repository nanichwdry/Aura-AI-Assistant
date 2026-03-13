import fetch from 'node-fetch';

/**
 * Search service with provider priority:
 * 1. SearXNG (if SEARXNG_BASE_URL configured)
 * 2. Brave Search (if BRAVE_SEARCH_API_KEY configured)
 * 3. DuckDuckGo (fallback)
 */

// Log active search provider on startup
if (process.env.SEARXNG_BASE_URL) {
  console.log('[SearchService] Provider: SearXNG');
} else if (process.env.BRAVE_SEARCH_API_KEY) {
  console.log('[SearchService] Provider: Brave Search');
} else {
  console.log('[SearchService] Provider: DuckDuckGo (fallback)');
}

export async function search(query, maxResults = 5) {
  try {
    // Priority 1: SearXNG
    if (process.env.SEARXNG_BASE_URL) {
      const results = await searxngSearch(query, maxResults);
      if (results.length > 0) return results;
    }
    
    // Priority 2: Brave Search
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const results = await braveSearch(query, maxResults);
      if (results.length > 0) return results;
    }
    
    // Priority 3: DuckDuckGo fallback
    return await duckDuckGoSearch(query, maxResults);
  } catch (error) {
    console.error('[SearchService] Error:', error.message);
    return [];
  }
}

async function searxngSearch(query, maxResults) {
  const baseUrl = process.env.SEARXNG_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&pageno=1`;
  
  const response = await fetch(url, { timeout: 5000 });
  if (!response.ok) {
    throw new Error(`SearXNG error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return (data.results || []).slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.content || '',
    source: 'searxng'
  }));
}

async function braveSearch(query, maxResults) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
    },
    timeout: 5000
  });
  
  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return (data.web?.results || []).map(item => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.description || '',
    source: 'brave'
  }));
}

async function duckDuckGoSearch(query, maxResults) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
  
  const response = await fetch(url, { timeout: 5000 });
  if (!response.ok) {
    throw new Error(`DuckDuckGo error: ${response.status}`);
  }
  
  const data = await response.json();
  const results = [];
  
  if (data.AbstractURL && data.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
      source: 'duckduckgo'
    });
  }
  
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, maxResults - 1)) {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: 'duckduckgo'
        });
      }
    }
  }
  
  return results.slice(0, maxResults);
}

export function rewriteQuery(userQuery) {
  // Clean up query for better search results
  let query = userQuery.trim();
  
  // Remove conversational fluff
  query = query.replace(/^(can you |could you |please |tell me |show me |find |search for )/i, '');
  query = query.replace(/\?+$/, '');
  
  // Add year for current info
  const currentYearKeywords = ['latest', 'current', 'recent', 'new', 'best', 'top'];
  if (currentYearKeywords.some(kw => query.toLowerCase().includes(kw))) {
    const year = new Date().getFullYear();
    if (!query.includes(year.toString())) {
      query += ` ${year}`;
    }
  }
  
  return query.trim();
}
