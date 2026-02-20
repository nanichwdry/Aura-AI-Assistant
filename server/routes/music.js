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
      console.log('YouTube API key not configured');
      return res.json({ success: true, videos: [], message: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.' });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data.error);
      return res.json({ 
        success: true, 
        videos: [], 
        message: `YouTube API error: ${data.error?.message || 'Unknown error'}. Please check your API key and quota.` 
      });
    }

    const videos = data.items?.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    })) || [];

    res.json({ success: true, videos });
  } catch (error) {
    console.error('Music search error:', error);
    res.json({ success: true, videos: [], message: `Error: ${error.message}` });
  }
});

export default router;
