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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
    });

    const results = await page.evaluate(() => {
      const videos = [];
      const items = document.querySelectorAll('ytd-video-renderer');

      items.forEach(item => {
        const titleEl = item.querySelector('#video-title');
        const link = titleEl?.href;
        const title = titleEl?.textContent?.trim();
        const timeEl = item.querySelector('div#metadata-line span:nth-child(2)');
        const time = timeEl?.textContent?.trim();

        if (title && link && time) {
          videos.push({ title, link, time });
        }
      });

      return videos.slice(0, 10);
    });

    await browser.close();
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scrape YouTube' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
