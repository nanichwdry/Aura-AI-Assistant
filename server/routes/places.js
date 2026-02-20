import express from 'express';

const router = express.Router();

router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || input.length < 3) {
      return res.json({ predictions: [] });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.json({ predictions: [] });
  }
});

export default router;
