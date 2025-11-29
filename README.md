# SOSAC TV - Free YouTube Search & Download PWA

A completely **FREE** YouTube search application with **UNLIMITED searches**, **real YouTube videos**, and **MP3/MP4 downloads**. No API keys, no payments, no quotas.

## 🎬 Features

✅ **Free Forever** - No API keys or payments required  
✅ **Unlimited Searches** - No quotas or rate limits  
✅ **Real YouTube Integration** - Search millions of videos  
✅ **Direct Downloads** - Convert to MP3/MP4 via ytdown.to  
✅ **Infinite Scroll** - Endless browsing without pagination  
✅ **Offline Support** - Progressive Web App (PWA)  
✅ **Auto-play Videos** - Tap WATCH to instantly play  
✅ **One-time Registration** - Register once, search forever  
✅ **Mobile Optimized** - Perfect on Android/iOS  
✅ **No Ads** - Ad-free YouTube player (youtube-nocookie.com)  

## 🚀 Quick Start

### Local Development
```bash
npm install
npm start
```
Then open `http://localhost:5000` in your browser.

### Features
- **Search videos** - Enter any query or browse trending
- **Tap WATCH** - Video auto-plays instantly
- **Tap ADD TO DOWNLOAD** - Converts & adds to queue
- **Download page** - Manage & download MP3/MP4
- **Offline mode** - Service Worker caches for offline viewing
- **Install on home screen** - Works like native app

## 📁 Project Structure

```
├── server.js              # Express backend (search + conversion)
├── index.html             # Main search interface
├── info.html              # One-time registration screen
├── watch.html             # YouTube embedded player
├── download.html          # Download queue management
├── service-worker.js      # Offline support & PWA
├── manifest.json          # Web app manifest
├── package.json           # Node.js dependencies
└── README.md              # This file
```

## 🔧 Backend API

### `/search?q=QUERY&page=PAGE`
- Searches Google's video index (YouTube, Vimeo, Dailymotion, etc.)
- Returns videos sorted by upload time (newest first)
- Supports infinite pagination
- No API quotas

### `/convert-url?url=YOUTUBE_URL&format=mp3|mp4`
- Converts YouTube URLs to direct download links
- Powered by play-dl library (FREE)
- Supports MP3 (audio) and MP4 (video)
- Returns ytcontent.net CDN URLs

## 📦 Dependencies

```json
{
  "express": "Web server",
  "cors": "Cross-origin requests",
  "youtube-search-api": "Free YouTube search",
  "play-dl": "Free video extraction",
  "ytsr": "YouTube search results",
  "fluent-ffmpeg": "Video processing"
}
```

## 📱 How It Works

1. **First Visit** → Registration screen (info.html)
2. **Search** → Enter query or browse trending (index.html)
3. **Watch** → Tap ▶️ WATCH → Auto-plays video (watch.html)
4. **Download** → Tap ⬇️ ADD TO DOWNLOAD → Converts to MP3/MP4
5. **Manage** → Download page shows all converted videos (download.html)
6. **Play/Download** → Direct ytdown.to links for MP3/MP4

## 🎯 Use Cases

- 🎵 Music Discovery & Download
- 🎬 Video Collection
- 📚 Educational Content
- ✈️ Offline Entertainment
- 📖 Content Curation

## 🔐 Privacy & Security

✅ No user data stored on server  
✅ No tracking or analytics  
✅ Searches are anonymous  
✅ Downloads go directly to device  
✅ One-time registration (localStorage)  
✅ Direct CDN downloads (no intermediaries)  

## 🌐 Deployment

### Deploy on Replit
1. Fork this repository
2. Import into Replit
3. Click "Run" to start

### Deploy on Other Platforms
- Heroku: `npm start`
- Railway: `npm start`
- Vercel: Use as API backend only
- Any Node.js hosting: `npm install && npm start`

**Note:** Backend requires Node.js runtime. Static hosting only won't work due to search & conversion APIs.

## 📝 Configuration

No configuration needed! The app works out of the box:
- Search is free (youtube-search-api)
- Video conversion is free (play-dl)
- No API keys required
- No environment variables needed

## 🐛 Troubleshooting

**Videos not loading?**
- Check internet connection
- Verify server is running (`npm start`)
- Clear browser cache

**Download not working?**
- Ensure video is publicly available on YouTube
- Try refreshing the page
- Check if ytdown.to is accessible in your region

**Offline mode not working?**
- Service Worker may need refresh
- Check browser console for errors
- Ensure app was visited when online

## 📄 License

Free to use. No restrictions. No registration needed.

## 🙌 Credits

- **youtube-search-api** - Google-powered YouTube search
- **play-dl** - Free video extraction
- **Express.js** - Web server framework
- **ytdown.to** - Video conversion service

---

**SOSAC TV** - Your free YouTube companion forever! 🎬✨

**Last Updated:** November 29, 2025  
**Version:** 10.0.0
