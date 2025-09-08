# AppSource Translation Console

A modern web-based console for managing translations and executing AppSource listing updates. Features a React-based interface with real-time updates, database persistence, and comprehensive translation management.

## Features

- **Modern Web Interface**: React-based responsive UI accessible in any browser
- **Database Persistence**: SQLite database for storing content and translations
- **Real-time Updates**: WebSocket integration for live console logs and progress tracking
- **Content Management**: Add, edit, and preview English content with HTML support
- **Translation Management**: Translate content to 40+ languages using OpenAI GPT-4o-mini
- **Batch Operations**: Select and process multiple languages simultaneously
- **Action Execution**: Separate translate, update, and validation operations
- **Status Tracking**: Real-time status indicators with visual progress feedback
- **Cache Management**: View cached translations and clear database
- **Field Configuration**: Toggle which fields to update (summary/description)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Settings

Make sure your `config.js` file is properly configured with:
- OpenAI API key
- Microsoft credentials
- Language filtering settings
- Validation settings

### 3. Start the Console Server

```bash
npm run console
```

The server will start on `http://localhost:3000`

### 4. Open in Browser

Navigate to `http://localhost:3000` in your web browser.

### 5. Add Your Content

- Use the "English Content" section to add your product name, summary, and description
- The content is automatically saved to the SQLite database
- You can edit content at any time through the web interface

## Usage

### Main Interface

1. **Configuration**: Toggle which fields to update (summary/description)
2. **Content Management**: Add, edit, and preview your English content
3. **Real-time Console**: Live logs and progress updates via WebSocket
4. **Batch Actions**: Select multiple languages and process them simultaneously
5. **Language Cards**: Individual language management with expandable previews
6. **Action Status**: Track the status of all operations with visual indicators

### Content Management

- **Add Content**: Use the "English Content" section to add your product information
- **Edit Content**: Click "Edit" to modify name, summary, or description
- **Preview Content**: View content in both HTML and preview modes
- **Character Limits**: Summary field shows character count with 100-character limit warning
- **Auto-save**: Content is automatically saved to the database

### Language Management

- **Select Languages**: Use checkboxes to select languages for batch operations
- **Individual Actions**: Each language card has three action buttons:
  - **Translate**: Generate translation using OpenAI and store in database
  - **Update**: Execute the update operation (integrates with existing update-listing.js)
  - **Validate**: Run validation checks on the Microsoft Partner Center
- **Status Tracking**: Real-time status indicators for each operation
- **Expandable Cards**: Click the chevron to expand and preview translations

### Translation Preview

- **Preview Mode**: See how the translated content will look with proper HTML rendering
- **HTML Mode**: View the raw HTML markup for technical review
- **Character Count**: Summary translations show character count with limit warnings
- **Real-time Updates**: Translations are updated in real-time as they complete

### Database Management

- **Persistent Storage**: All content and translations are stored in SQLite database
- **Cache Status**: View how many translations are cached in the database
- **Clear Cache**: Remove all cached translations from the database
- **Version History**: Product content changes are tracked with timestamps

## API Endpoints

The console provides comprehensive REST API endpoints for programmatic access:

### Content Management
- `GET /api/content` - Get English content from database
- `POST /api/content` - Update English content in database

### Translation Management
- `GET /api/languages` - Get supported languages (with filtering)
- `GET /api/translation/:languageCode` - Get translation for specific language
- `POST /api/translate/:languageCode` - Translate content for specific language
- `POST /api/translate/batch` - Translate multiple languages simultaneously

### Cache Management
- `GET /api/cache/status` - Get database cache status and statistics
- `DELETE /api/cache` - Clear all translations from database

### Configuration
- `GET /api/config/fields` - Get field update configuration
- `POST /api/config/fields` - Update field update configuration

### Execution
- `POST /api/execute/update` - Execute update operation (integrates with update-listing.js)
- `POST /api/execute/validate` - Execute validation operation

### Monitoring
- `GET /api/console/logs` - Get console logs history

## Integration with Existing Script

The console is designed to work seamlessly with your existing `update-listing.js` script:

- **Shared Database**: Both systems use the same SQLite database for content and translations
- **Configuration**: Uses the same `config.js` file for all settings
- **OpenAI Integration**: Same translation prompts and GPT-4o-mini model
- **Language Support**: Same language list and filtering configuration
- **Translation Logic**: Identical translation logic and caching mechanisms
- **Environment Variables**: Console can pass cached translations to CLI script

## Development

### File Structure

```
appsource-listing-updater/
├── server.js              # Express server with API endpoints and WebSocket
├── update-listing.js      # CLI automation script
├── database.js            # SQLite database management
├── config.js              # Shared configuration (not in version control)
├── config.example.js      # Example configuration
├── package.json           # Dependencies and scripts
├── product_content.db     # SQLite database (created automatically)
├── public/
│   └── index.html         # React frontend with real-time updates
├── chrome-profile/        # Chrome user data directory
└── README.md              # Main documentation
```

### Scripts

- `npm start` - Run the CLI automation script
- `npm run console` - Start the web console server
- `npm test` - Run tests (placeholder)

### Database Schema

The SQLite database includes two main tables:

- **`product_content`**: Stores English content with version history
- **`translations`**: Stores translated content for all languages

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the PORT environment variable or kill existing process
2. **Database Errors**: Delete `product_content.db` to reset the database
3. **OpenAI API Errors**: Check your API key in config.js and verify billing
4. **Translation Failures**: Verify internet connection and API rate limits
5. **Content Not Loading**: Ensure you've added content through the web interface
6. **WebSocket Connection Issues**: Check browser console for connection errors

### Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design
- WebSocket support required for real-time updates

### Database Issues

- **Corrupted Database**: Delete `product_content.db` to reset
- **Permission Errors**: Check file permissions in project directory
- **Migration Issues**: Database schema is created automatically on first run

## Security Notes

- The console runs locally and doesn't expose credentials
- API keys are handled server-side only
- No data is sent to external servers except OpenAI for translations
- Database is stored locally in SQLite format
- Use HTTPS in production environments

## Performance Considerations

- **Database Size**: SQLite database grows with content and translations
- **Memory Usage**: WebSocket connections and in-memory caching
- **API Limits**: OpenAI API has rate limits and token costs
- **Browser Resources**: Large translation previews may impact browser performance

## Future Enhancements

- Real-time progress tracking for long operations
- Export/import translation data (JSON/CSV)
- Translation quality scoring and validation
- Integration with external translation services
- Advanced filtering and search capabilities
- User authentication and multi-user support
- Translation history and version control
- Bulk operations and scheduling
