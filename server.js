const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2'
    });

    await page.waitForSelector('ytd-video-renderer', { timeout: 10000 });

    const results = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('ytd-video-renderer')).slice(0, 10);
      return videos.map(video => {
        const title = video.querySelector('#video-title')?.textContent?.trim();
        const link = 'https://www.youtube.com' + video.querySelector('#video-title')?.getAttribute('href');
        const duration = video.querySelector('ytd-thumbnail-overlay-time-status-renderer span')?.textContent?.trim();
        const views = video.querySelector('#metadata-line span')?.textContent?.trim();
        return { title, link, duration, views };
      });
    });

    await browser.close();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
