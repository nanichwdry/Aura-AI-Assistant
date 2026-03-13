import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Scrape service for extracting clean content from web pages
 */

export async function extract(url, maxLength = 5000) {
  try {
    console.log(`[ScrapeService] Extracting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();
    $('.ad, .ads, .advertisement, .social-share, .comments').remove();
    
    // Try to find main content
    let content = '';
    
    // Priority selectors for main content
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-content',
      '#content',
      '.entry-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = element.text();
        break;
      }
    }
    
    // Fallback to body
    if (!content || content.length < 100) {
      content = $('body').text();
    }
    
    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Truncate if too long
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }
    
    console.log(`[ScrapeService] Extracted ${content.length} chars from ${url}`);
    
    return {
      url,
      content,
      title: $('title').text().trim() || '',
      success: true
    };
  } catch (error) {
    console.error(`[ScrapeService] Error extracting ${url}:`, error.message);
    return {
      url,
      content: '',
      title: '',
      success: false,
      error: error.message
    };
  }
}

export async function extractMultiple(urls, maxLength = 5000) {
  const results = await Promise.allSettled(
    urls.map(url => extract(url, maxLength))
  );
  
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.success && r.content.length > 100);
}
