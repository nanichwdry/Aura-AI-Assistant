import { executeAgent } from '../agent/agent_core.js';
import { search, rewriteQuery } from './searchService.js';
import { extractMultiple } from './scrapeService.js';

/**
 * Unified message router for all Aura input channels
 * Handles: web app, voice, WhatsApp
 */

export async function handleAuraMessage({ channel, userId, message, sessionId, metadata = {} }) {
  try {
    console.log(`[AuraRouter] ${channel} message from ${userId}: ${message.substring(0, 100)}`);
    
    // Classify intent and check if search is needed
    const needsSearch = shouldUseSearch(message);
    
    let enhancedMessage = message;
    let sources = [];
    
    // Perform web research if needed
    if (needsSearch) {
      const searchResult = await performWebResearch(message);
      if (searchResult.success) {
        enhancedMessage = buildEnhancedPrompt(message, searchResult.content);
        sources = searchResult.sources;
      }
    }
    
    // Route to existing Aura agent
    const agentResponse = await executeAgent(enhancedMessage, sessionId, userId);
    
    // Format response based on channel
    const formattedResponse = formatForChannel(agentResponse, channel, sources);
    
    return {
      success: true,
      response: formattedResponse,
      sources,
      channel,
      searchUsed: needsSearch
    };
  } catch (error) {
    console.error('[AuraRouter] Error:', error.message);
    return {
      success: false,
      response: 'I encountered an error processing your request. Please try again.',
      error: error.message
    };
  }
}

function shouldUseSearch(message) {
  const searchTriggers = [
    'latest', 'current', 'recent', 'new', 'today',
    'best', 'top', 'compare', 'vs', 'versus',
    'price', 'cost', 'how much',
    'how to', 'fix', 'solve', 'troubleshoot',
    'what is', 'who is', 'where is', 'when is',
    'recommend', 'suggestion', 'advice',
    'news', 'update', 'happening'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Don't search if URL provided
  if (lowerMessage.includes('http://') || lowerMessage.includes('https://')) {
    return false;
  }
  
  // Don't search if code provided
  if (lowerMessage.includes('```') || lowerMessage.includes('function') || lowerMessage.includes('const ')) {
    return false;
  }
  
  // Check for search triggers
  return searchTriggers.some(trigger => lowerMessage.includes(trigger));
}

async function performWebResearch(query, maxPages = 3) {
  try {
    // Rewrite query for better results
    const searchQuery = rewriteQuery(query);
    console.log(`[AuraRouter] Searching: ${searchQuery}`);
    
    // Get search results
    const results = await search(searchQuery, 5);
    
    if (results.length === 0) {
      return { success: false, content: '', sources: [] };
    }
    
    // Select top URLs to scrape
    const urlsToScrape = results.slice(0, maxPages).map(r => r.url);
    
    // Scrape pages
    const scrapedPages = await extractMultiple(urlsToScrape, 3000);
    
    if (scrapedPages.length === 0) {
      return { success: false, content: '', sources: [] };
    }
    
    // Build context from scraped content
    const context = scrapedPages
      .map((page, idx) => `[Source ${idx + 1}: ${page.title}]\n${page.content}`)
      .join('\n\n---\n\n');
    
    const sources = scrapedPages.map(page => ({
      title: page.title,
      url: page.url
    }));
    
    console.log(`[AuraRouter] Scraped ${scrapedPages.length} pages, ${context.length} chars`);
    
    return {
      success: true,
      content: context,
      sources
    };
  } catch (error) {
    console.error('[AuraRouter] Research error:', error.message);
    return { success: false, content: '', sources: [] };
  }
}

function buildEnhancedPrompt(userQuery, researchContent) {
  return `User question: ${userQuery}

Web research results:
${researchContent}

Based on the above research, provide a direct, concise answer to the user's question. Include key points and cite sources when relevant.`;
}

function formatForChannel(agentResponse, channel, sources = []) {
  let response = agentResponse.message || agentResponse.reasoning || 'No response generated';
  
  // For WhatsApp: keep it concise
  if (channel === 'whatsapp') {
    // Limit length
    if (response.length > 1000) {
      response = response.substring(0, 1000) + '...';
    }
    
    // Add sources if available
    if (sources.length > 0) {
      response += '\n\nSources:\n';
      sources.slice(0, 3).forEach((source, idx) => {
        response += `${idx + 1}. ${source.url}\n`;
      });
    }
  }
  
  // For web/voice: return full response
  return response;
}
