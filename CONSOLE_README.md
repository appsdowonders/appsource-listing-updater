# AppSource Translation Console

A web-based console for managing translations and executing AppSource listing updates.

## Features

- **Web Interface**: Modern, responsive UI accessible in any browser
- **Content Preview**: View English summary and description in both HTML and preview modes
- **Translation Management**: Translate content to multiple languages using OpenAI
- **Language Support**: Manage all supported AppSource languages with filtering
- **Batch Operations**: Translate multiple languages at once
- **Action Execution**: Execute translation, update, and validation operations separately
- **Status Tracking**: Real-time status indicators for all operations
- **Cache Management**: View and clear translation cache

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Settings

Make sure your `config.js` file is properly configured with:
- OpenAI API key
- Microsoft credentials
- Product information
- Language settings

### 3. Start the Console Server

```bash
npm run console
```

The server will start on `http://localhost:3000`

### 4. Open in Browser

Navigate to `http://localhost:3000` in your web browser.

## Usage

### Main Interface

1. **Content Preview**: View your English summary and description at the top
2. **Batch Actions**: Select multiple languages and translate them at once
3. **Language Cards**: Individual language management with expandable previews
4. **Action Status**: Track the status of all operations

### Language Management

- **Select Languages**: Use checkboxes to select languages for batch operations
- **Individual Actions**: Each language card has three action buttons:
  - **Translate**: Generate translation using OpenAI
  - **Update**: Execute the update operation (integrates with existing update-listing.js)
  - **Validate**: Run validation checks

### Translation Preview

- **Preview Mode**: See how the translated content will look
- **HTML Mode**: View the raw HTML markup
- **Expandable Cards**: Click the chevron to expand language cards and see translations

### Cache Management

- **Cache Status**: View how many translations are cached
- **Clear Cache**: Remove all cached translations
- **Persistent Storage**: Translations are cached in memory during the session

## API Endpoints

The console provides REST API endpoints for programmatic access:

- `GET /api/content` - Get English content
- `GET /api/languages` - Get supported languages
- `GET /api/translation/:languageCode` - Get translation for specific language
- `POST /api/translate/:languageCode` - Translate content for specific language
- `POST /api/translate/batch` - Translate multiple languages
- `GET /api/cache/status` - Get cache status
- `DELETE /api/cache` - Clear cache
- `POST /api/execute/update` - Execute update operation
- `POST /api/execute/validate` - Execute validation operation

## Integration with Existing Script

The console is designed to work alongside your existing `update-listing.js` script:

- **Translation Cache**: Both systems share the same translation logic
- **Configuration**: Uses the same `config.js` file
- **OpenAI Integration**: Same translation prompts and models
- **Language Support**: Same language list and filtering

## Development

### File Structure

```
├── server.js              # Express server with API endpoints
├── public/
│   └── index.html         # React frontend
├── update-listing.js      # Original update script
├── config.js              # Shared configuration
└── package.json           # Dependencies and scripts
```

### Scripts

- `npm start` - Run the original update script
- `npm run console` - Start the web console server

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the PORT environment variable
2. **OpenAI API Errors**: Check your API key in config.js
3. **Translation Failures**: Verify internet connection and API limits
4. **Cache Issues**: Use the "Clear Cache" button to reset

### Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design

## Security Notes

- The console runs locally and doesn't expose credentials
- API keys are handled server-side only
- No data is sent to external servers except OpenAI for translations
- Use HTTPS in production environments

## Future Enhancements

- Real-time progress tracking for long operations
- Export/import translation data
- Translation quality scoring
- Integration with external translation services
- Advanced filtering and search
- User authentication and multi-user support
