const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const googleURL = `https://www.google.com/search?q=site:youtube.com+${encodeURIComponent(query)}`;
    const response = await axios.get(googleURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('youtube.com/watch')) {
        const url = decodeURIComponent(href).match(/\/url\?q=(.*?)&/);
        if (url && url[1]) {
          const title = $(el).text().trim();
          if (title && !results.find(r => r.link === url[1])) {
            results.push({ title, link: url[1] });
          }
        }
      }
    });

    res.json(results.slice(0, 10));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
