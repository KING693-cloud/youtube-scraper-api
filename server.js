const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const https = require('https');
const http = require('http');
const ytsr = require('ytsr');

const app = express();

// Serve static files (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname)));

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Handle preflight requests
app.options('*', cors());

// Search YouTube Videos using ytsr (FREE, no API key needed)
async function searchGoogleVideos(query) {
  try {
    console.log(`[SEARCH] Using ytsr to search: ${query}`);
    const results = await ytsr(query, { limit: 100 });
    
    if (!results || !results.items) return [];
    
    return results.items
      .filter(item => item.type === 'video')
      .map(item => {
        return {
          title: item.title || 'Untitled',
          link: item.url || `https://www.youtube.com/watch?v=${item.id}`,
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          channelTitle: item.author?.name || 'YouTube',
          duration: item.duration || null,
          views: item.views ? `${item.views} views` : 'N/A',
          uploadedAt: item.uploadedAt || 'Recently',
          source: 'youtube-video'
        };
      });
  } catch (error) {
    console.error('[GOOGLE VIDEOS] Search error:', error.message);
    return [];
  }
}

app.get('/search', async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 1;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  try {
    console.log(`[SEARCH] Searching Google Videos for: ${query} (page ${page})`);
    
    // Search Google Videos - returns videos from YouTube, Vimeo, Dailymotion, and other platforms indexed by Google
    let videos = await searchGoogleVideos(query);
    
    if (!videos || videos.length === 0) {
      return res.json({
        videos: [],
        page: page,
        hasMore: false
      });
    }

    // Sort by upload time - newer videos first
    videos = videos.sort((a, b) => {
      const timeA = parseUploadTime(a.uploadedAt);
      const timeB = parseUploadTime(b.uploadedAt);
      return timeB - timeA;
    });

    // Pagination - unlimited results with infinite scroll
    const perPage = 30;
    const startIdx = (page - 1) * perPage;
    const endIdx = page * perPage;
    const paginatedVideos = videos.slice(startIdx, endIdx);

    res.json({
      videos: paginatedVideos,
      page: page,
      hasMore: true // Always has more for infinite scroll
    });

  } catch (err) {
    console.error('[SEARCH] Error:', err.message);
    res.status(500).json({ 
      error: 'Search temporarily unavailable',
      message: err.message
    });
  }
});

// Get video info by YouTube URL
app.get('/video-by-url', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Missing URL' });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  try {
    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const videoId = videoIdMatch[1];
    console.log(`[VIDEO] Fetching video info for: ${videoId}`);

    const video = {
      title: 'YouTube Video',
      link: videoUrl,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: 'YouTube',
      duration: null,
      views: 'N/A',
      uploadedAt: 'Recently',
      source: 'direct-url'
    };

    res.json({
      videos: [video],
      page: 1,
      hasMore: false
    });

  } catch (err) {
    console.error('[VIDEO] Error:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch video',
      message: err.message
    });
  }
});

// Helper function to parse upload time strings
function parseUploadTime(timeStr) {
  if (!timeStr) return 0;
  
  const now = Date.now();
  const timeStr_lower = timeStr.toLowerCase();
  
  if (timeStr_lower.includes('second')) return now;
  if (timeStr_lower.includes('minute')) return now - (60 * 1000);
  if (timeStr_lower.includes('hour')) return now - (60 * 60 * 1000);
  if (timeStr_lower.includes('day')) {
    const days = parseInt(timeStr_lower) || 1;
    return now - (days * 24 * 60 * 60 * 1000);
  }
  if (timeStr_lower.includes('week')) {
    const weeks = parseInt(timeStr_lower) || 1;
    return now - (weeks * 7 * 24 * 60 * 60 * 1000);
  }
  if (timeStr_lower.includes('month')) {
    const months = parseInt(timeStr_lower) || 1;
    return now - (months * 30 * 24 * 60 * 60 * 1000);
  }
  if (timeStr_lower.includes('year')) {
    const years = parseInt(timeStr_lower) || 1;
    return now - (years * 365 * 24 * 60 * 60 * 1000);
  }
  
  return 0;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get direct Google video URL for downloads
// Convert YouTube URL to MP3/MP4 using Convert2MP3s API (FREE, no API key)
app.get('/convert-url', async (req, res) => {
  let videoUrl = req.query.url;
  const format = req.query.format || 'mp4';
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log(`[CONVERT-URL] Converting to ${format.toUpperCase()} via Convert2MP3s API`);
    
    // Call Convert2MP3s API - completely FREE, no authentication needed
    const apiUrl = `https://convert2mp3s.com/api/single/${format}?url=${encodeURIComponent(videoUrl)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    if (!response.ok) {
      console.error(`[CONVERT-URL] API error: ${response.status}`);
      return res.status(500).json({ error: 'Conversion service error, try again' });
    }

    const data = await response.json();

    if (!data.success || !data.link) {
      console.error('[CONVERT-URL] No download link in response:', data);
      return res.status(500).json({ 
        error: 'Could not convert video - it may be restricted or unavailable'
      });
    }

    res.json({
      url: data.link,
      title: data.title || 'video',
      format: format,
      duration: data.duration || 0
    });

  } catch (err) {
    console.error('[CONVERT-URL] Error:', err.message);
    res.status(500).json({ 
      error: 'Failed to convert - check URL and try again',
      tip: 'Make sure the YouTube URL is valid and the video is public'
    });
  }
});

app.get('/get-google-url', (req, res) => {
  let videoUrl = req.query.url;
  const format = req.query.format || 'mp4';
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log(`[GOOGLE-URL] Extracting direct Google URL for ${format.toUpperCase()}`);
    
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      '--no-warnings',
      '-f', format === 'mp3' ? 'bestaudio' : 'best[height<=240]/bestvideo[height<=240]+bestaudio',
      videoUrl
    ]);
    
    let output = '';
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      try {
        if (code !== 0) {
          return res.status(500).json({ error: 'Failed to extract URL' });
        }
        
        const info = JSON.parse(output);
        const formats = info.formats || [];
        
        // Find direct Google video URL
        let googleUrl = null;
        
        if (format === 'mp3') {
          // For audio, get bestaudio with direct URL
          for (const fmt of formats) {
            if (fmt.acodec && fmt.acodec !== 'none' && fmt.url) {
              googleUrl = fmt.url;
              break;
            }
          }
        } else {
          // For video, get best video with direct URL
          for (const fmt of formats) {
            if (fmt.vcodec && fmt.vcodec !== 'none' && fmt.url) {
              googleUrl = fmt.url;
              break;
            }
          }
        }
        
        if (!googleUrl && info.url) {
          googleUrl = info.url;
        }
        
        if (googleUrl) {
          res.json({ 
            url: googleUrl,
            title: info.title || 'video'
          });
        } else {
          res.status(500).json({ error: 'No direct URL found' });
        }
      } catch (err) {
        console.error('[GOOGLE-URL] Parse error:', err.message);
        res.status(500).json({ error: 'Parse error' });
      }
    });
    
    ytdlp.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('WARNING')) {
        console.error('[yt-dlp]', msg);
      }
    });
    
  } catch (err) {
    console.error('[GOOGLE-URL] Error:', err.message);
    res.status(500).json({ error: 'Failed to extract URL' });
  }
});

// Get direct Google video streaming URL (bypasses YouTube player)
app.get('/get-stream-url', (req, res) => {
  let videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log('[STREAM-URL] Extracting direct video URL from:', videoUrl);
    
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      '--no-warnings',
      '-f', 'best[ext=mp4]/best',
      videoUrl
    ]);
    
    let output = '';
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      try {
        if (code !== 0) {
          console.warn('[STREAM-URL] yt-dlp error, code:', code);
          return res.status(500).json({ error: 'Failed to extract stream URL' });
        }
        
        const info = JSON.parse(output);
        const formats = info.formats || [];
        
        // Find best video format with direct URL (Google video URL)
        let bestUrl = null;
        let bestFormat = null;
        
        for (const fmt of formats) {
          if (fmt.url && fmt.vcodec !== 'none' && fmt.ext === 'mp4') {
            if (!bestFormat || (fmt.height && fmt.height > (bestFormat.height || 0))) {
              bestUrl = fmt.url;
              bestFormat = fmt;
            }
          }
        }
        
        if (!bestUrl && info.url) {
          bestUrl = info.url;
        }
        
        if (bestUrl) {
          console.log('[STREAM-URL] ✅ Found direct Google video URL');
          res.json({ 
            url: bestUrl,
            title: info.title || 'Video',
            duration: info.duration || 0,
            thumbnail: info.thumbnail || null
          });
        } else {
          console.warn('[STREAM-URL] No direct URL found, falling back to /stream endpoint');
          res.json({ 
            url: `/stream?url=${encodeURIComponent(videoUrl)}`,
            title: info.title || 'Video',
            duration: info.duration || 0,
            thumbnail: info.thumbnail || null,
            fallback: true
          });
        }
      } catch (err) {
        console.error('[STREAM-URL] Parse error:', err.message);
        res.status(500).json({ error: 'Failed to parse video info' });
      }
    });
    
    ytdlp.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('WARNING')) {
        console.error('[yt-dlp]', msg);
      }
    });
    
  } catch (err) {
    console.error('[STREAM-URL] Error:', err.message);
    res.status(500).json({ error: 'Stream URL extraction failed' });
  }
});

// Get video info with available formats and file sizes using yt-dlp (YouTube-style)
app.get('/video-info', (req, res) => {
  let videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log('[INFO] Fetching all formats for:', videoUrl);
    
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      '--no-warnings',
      videoUrl
    ]);
    
    let output = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      try {
        if (code !== 0) {
          return res.json({
            video: [
              { format: 'best[height<=480]', quality: '480p', size: '~40MB' },
              { format: 'best[height<=360]', quality: '360p', size: '~25MB' },
              { format: 'best[height<=240]', quality: '240p', size: '~15MB' }
            ],
            audio: [
              { format: 'bestaudio[ext=m4a]', quality: 'MP4 Audio (Best)', size: '~8MB' },
              { format: 'bestaudio[ext=webm]', quality: 'WebM Audio', size: '~7MB' },
              { format: 'bestaudio[ext=opus]', quality: 'Opus Audio', size: '~5MB' }
            ]
          });
        }
        
        const info = JSON.parse(output);
        const formats = info.formats || [];
        
        const videoFormats = {};
        const audioFormats = {};
        
        for (const format of formats) {
          // Video formats - group by height
          if (format.vcodec && format.vcodec !== 'none' && format.height && format.ext) {
            const height = format.height;
            if (!videoFormats[height]) {
              const size = format.filesize ? Math.round(format.filesize / 1024 / 1024) : 0;
              videoFormats[height] = {
                format: format.format_id,
                quality: `${height}p (${format.ext})`,
                size: size > 0 ? `${size}MB` : 'Unknown',
                height: height
              };
            }
          }
          
          // Audio only formats - group by codec/ext
          if (format.acodec && format.acodec !== 'none' && !format.vcodec && format.ext) {
            const key = format.ext;
            if (!audioFormats[key]) {
              const size = format.filesize ? Math.round(format.filesize / 1024 / 1024) : 0;
              const qualityName = format.abr ? `${format.abr}kbps` : 'Best';
              audioFormats[key] = {
                format: format.format_id,
                quality: `${format.ext.toUpperCase()} Audio (${qualityName})`,
                size: size > 0 ? `${size}MB` : 'Unknown'
              };
            }
          }
        }
        
        // Sort videos by height (descending)
        const sortedVideos = Object.values(videoFormats)
          .sort((a, b) => b.height - a.height)
          .slice(0, 6)
          .map(({ height, ...rest }) => rest);
        
        const sortedAudio = Object.values(audioFormats).slice(0, 6);
        
        res.json({
          video: sortedVideos.length > 0 ? sortedVideos : [
            { format: 'best[height<=480]', quality: '480p', size: '~40MB' },
            { format: 'best[height<=360]', quality: '360p', size: '~25MB' }
          ],
          audio: sortedAudio.length > 0 ? sortedAudio : [
            { format: 'bestaudio[ext=m4a]', quality: 'MP4 Audio (Best)', size: '~8MB' },
            { format: 'bestaudio[ext=webm]', quality: 'WebM Audio', size: '~7MB' }
          ]
        });
        
      } catch (err) {
        console.error('[INFO] Parse error:', err.message);
        res.json({
          video: [
            { format: 'best[height<=480]', quality: '480p', size: '~40MB' },
            { format: 'best[height<=360]', quality: '360p', size: '~25MB' }
          ],
          audio: [
            { format: 'bestaudio[ext=m4a]', quality: 'MP4 Audio (Best)', size: '~8MB' },
            { format: 'bestaudio[ext=webm]', quality: 'WebM Audio', size: '~7MB' }
          ]
        });
      }
    });
    
  } catch (err) {
    console.error('[INFO] Error:', err.message);
    res.json({
      video: [
        { format: 'best[height<=480]', quality: '480p', size: '~40MB' },
        { format: 'best[height<=360]', quality: '360p', size: '~25MB' }
      ],
      audio: [
        { format: 'bestaudio[ext=m4a]', quality: 'MP4 Audio (Best)', size: '~8MB' },
        { format: 'bestaudio[ext=webm]', quality: 'WebM Audio', size: '~7MB' }
      ]
    });
  }
});

// Custom YouTube Video Downloader - MP4 & MP3
app.get('/download', (req, res) => {
  let videoUrl = req.query.url;
  const format = req.query.format || 'mp4';
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log(`\n[DOWNLOAD] Format: ${format.toUpperCase()}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    
    if (format === 'mp4') {
      console.log('[MP4] Starting video download...');
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
      
      // Use universal format selector that works on ANY YouTube video
      // bestvideo+bestaudio = combines best video + best audio (auto-merges)
      // /best = fallback if separate streams not available
      const ytdlp = spawn('yt-dlp', [
        '-f', 'best[height<=240]/bestvideo[height<=240]+bestaudio/best',
        '-o', '-',
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '--no-progress',
        '--socket-timeout', '120',
        '-R', '5',
        '--fragment-retries', '5',
        '--hls-prefer-native',
        '--hls-use-mpegts',
        videoUrl
      ]);
      
      ytdlp.stdout.pipe(res);
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          console.log('[MP4] ✅ Download complete');
        } else {
          console.error('[MP4] Exit code:', code);
        }
      });
      
      ytdlp.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('WARNING') && !msg.includes('Downloading') && !msg.includes('Merger')) {
          console.error('[yt-dlp]', msg);
        }
      });
      
      ytdlp.on('error', (err) => {
        console.error('[MP4] Error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
      });
      
    } else if (format === 'mp3') {
      console.log('[MP3] Starting audio download...');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
      
      const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '-o', '-',
        '--no-warnings',
        '--no-progress',
        '--socket-timeout', '30',
        '-R', '3',
        videoUrl
      ]);
      
      const ffmpeg = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'quiet',
        '-i', 'pipe:0',
        '-q:a', '9',
        '-map', 'a',
        '-map_metadata', '-1',
        '-codec:a', 'libmp3lame',
        '-b:a', '128k',
        '-f', 'mp3',
        'pipe:1'
      ]);
      
      ytdlp.stdout.pipe(ffmpeg.stdin);
      ffmpeg.stdout.pipe(res);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('[MP3] ✅ Download complete');
        } else {
          console.error('[MP3] Exit code:', code);
        }
      });
      
      ytdlp.on('error', (err) => {
        console.error('[yt-dlp]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Extract failed' });
      });
      
      ffmpeg.on('error', (err) => {
        console.error('[ffmpeg]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Convert failed' });
      });
    }
    
  } catch (err) {
    console.error('[DOWNLOAD] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  }
});

// Stream YouTube video as playable MP4 (like a regular video file)
app.get('/stream', (req, res) => {
  let videoUrl = req.query.url;
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    videoUrl = decodeURIComponent(videoUrl);
    console.log(`\n[STREAM] Playing video as MP4:`, videoUrl);
    
    // Set streaming headers for video playback
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    
    // Extract best available format - simplest approach that works on all videos
    const ytdlp = spawn('yt-dlp', [
      '-f', 'best',  // Just get BEST quality regardless of format
      '-o', '-',
      '--no-warnings',
      '--socket-timeout', '60',
      '--no-playlist',
      '--no-progress',
      '-R', '10',
      '--fragment-retries', '10',
      '--hls-prefer-native',
      videoUrl
    ]);
    
    
    ytdlp.stdout.pipe(res);
    
    ytdlp.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('Deleting original')) {
        console.error('[yt-dlp]', msg);
      }
    });
    
    ytdlp.on('error', (err) => {
      console.error('[STREAM] Error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        console.log('[STREAM] ✅ Video streamed successfully');
      } else {
        console.error('[STREAM] Exit code:', code);
      }
    });
    
  } catch (err) {
    console.error('[STREAM] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' });
    }
  }
});

// Serve static files from root directory (AFTER API routes)
app.use(express.static(path.join(__dirname)));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
