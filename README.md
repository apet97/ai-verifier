# 🤖 AI Verifier - YouTube Extension

A Chrome extension that helps users collaboratively tag and identify AI-generated content on YouTube.

## Features

- **Multi-Category AI Tagging**: Tag videos with 6 different AI content types
  - 🤖 Fully AI-Generated
  - 🎨 AI-Assisted Visuals
  - 🗣️ AI Voice/Narration
  - 📝 AI-Scripted Content
  - 👤 Deepfake/Face Swap
  - 🎵 AI-Generated Music

- **Confidence-Based Filtering**: Filter content based on AI detection confidence levels
- **Visual Badges**: See AI confidence indicators on video thumbnails
- **Real-time Statistics**: Track your tagging activity and filtering stats
- **Data Export/Import**: Export your tagged videos and settings

## Installation

### Method 1: Load Unpacked Extension (Recommended)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The AI Verifier extension should now appear in your extensions

### Method 2: Download Release

1. Go to the [Releases](https://github.com/apet97/ai-verifier/releases) page
2. Download the latest `.zip` file
3. Extract and follow Method 1 steps

## Usage

1. **Tagging Videos**: Click the 🤖 AI button on any YouTube video to tag it
2. **Viewing Badges**: AI confidence badges appear on video thumbnails
3. **Managing Settings**: Click the extension icon to access filters and statistics
4. **Exporting Data**: Use the popup to export your tagging data

## API Server (Optional)

The extension can work with a local API server for enhanced features:

1. Navigate to the `api-server` directory
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Server runs on `http://localhost:3000`

## Privacy

- All data is stored locally in your browser
- No personal information is collected or transmitted
- Tags are stored anonymously

## Support the Project

If you find this extension useful, consider supporting development:

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a Pull Request

## Development

### Project Structure
```
ai-verifier-fixed/
├── manifest.json          # Extension manifest
├── contentScript.js       # Main content script
├── background.js          # Service worker
├── popup/                 # Extension popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/                 # Extension icons
└── README.md
```

### Building

The extension is ready to use as-is. No build process required.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v0.2.0
- Added multi-category AI tagging
- Enhanced YouTube SPA navigation detection
- Improved content filtering
- Added statistics and analytics
- Better error handling and stability

### v0.1.0
- Initial release
- Basic AI tagging functionality
- YouTube integration
