import express from 'express';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser();

const RSS_FEEDS = {
  us: { en: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
  in: { 
    en: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
    hi: 'https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi',
    te: 'https://news.google.com/rss?hl=te&gl=IN&ceid=IN:te',
    ta: 'https://news.google.com/rss?hl=ta&gl=IN&ceid=IN:ta'
  },
  gb: { en: 'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en' },
  ca: { en: 'https://news.google.com/rss?hl=en-CA&gl=CA&ceid=CA:en' },
  au: { en: 'https://news.google.com/rss?hl=en-AU&gl=AU&ceid=AU:en' },
  de: { de: 'https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de' },
  fr: { fr: 'https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr' },
  es: { es: 'https://news.google.com/rss?hl=es&gl=ES&ceid=ES:es' },
  jp: { ja: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja' },
  br: { pt: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-BR' },
  mx: { es: 'https://news.google.com/rss?hl=es-MX&gl=MX&ceid=MX:es-419' }
};

router.post('/fetch', async (req, res) => {
  const requestId = Date.now().toString();
  try {
    const { country = 'us', language = 'en', category = 'general', query } = req.body;

    let feedUrl = RSS_FEEDS[country]?.[language] || RSS_FEEDS.us.en;
    
    if (query) {
      feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country.toUpperCase()}&ceid=${country.toUpperCase()}:${language}`;
    }

    console.log(`[${requestId}] Fetching news: country=${country}, language=${language}, category=${category}, query=${query || 'none'}`);

    const feed = await parser.parseURL(feedUrl);
    
    const articles = feed.items.slice(0, 20).map(item => ({
      title: item.title || '',
      description: item.contentSnippet || item.content?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
      url: item.link || '',
      publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      source: { name: item.source?._ || 'Google News' },
      urlToImage: null
    }));

    console.log(`[${requestId}] News fetched: ${articles.length} articles`);
    res.json({ ok: true, articles });
  } catch (error) {
    console.error(`[${requestId}] News fetch error:`, error.message);
    res.json({ ok: false, error: { message: error.message } });
  }
});

export default router;
