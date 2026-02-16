import express from 'express';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'YouTube API key not configured' });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: data.error?.message || 'YouTube API error' });
    }

    const videos = data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    }));

    res.json({ success: true, videos });
  } catch (error) {
    console.error('Music search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
