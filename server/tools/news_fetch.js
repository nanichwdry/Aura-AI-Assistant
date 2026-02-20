import Parser from 'rss-parser';

const parser = new Parser();

export async function news_fetch(input) {
  try {
    const { country = 'in', language = 'te', query } = input;
    
    let feedUrl = `https://news.google.com/rss?hl=${language}&gl=${country.toUpperCase()}&ceid=${country.toUpperCase()}:${language}`;
    
    if (query) {
      feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country.toUpperCase()}&ceid=${country.toUpperCase()}:${language}`;
    }

    const feed = await parser.parseURL(feedUrl);
    
    const articles = feed.items.slice(0, 10).map(item => ({
      title: item.title || '',
      description: item.contentSnippet || '',
      url: item.link || '',
      publishedAt: item.pubDate || new Date().toISOString(),
      source: item.source?._ || 'Google News'
    }));

    return {
      success: true,
      data: {
        articles,
        count: articles.length,
        language,
        country
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const news_fetch_schema = {
  name: 'news_fetch',
  description: 'Fetch news headlines in any language (Telugu, Hindi, English, etc.)',
  parameters: {
    type: 'object',
    properties: {
      country: { type: 'string', description: 'Country code (in=India, us=USA)', default: 'in' },
      language: { type: 'string', description: 'Language code (te=Telugu, hi=Hindi, en=English)', default: 'te' },
      query: { type: 'string', description: 'Search query (optional)' }
    }
  }
};
