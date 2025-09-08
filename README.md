# AppSource Listing Translation Tool

A comprehensive solution for translating and updating Microsoft 365 add-in listings across multiple languages. Features both a modern web console interface and automated CLI script using Selenium WebDriver and OpenAI's GPT models.

## 🚀 Features

- **Dual Interface**: Modern React-based web console + powerful CLI automation script
- **AI Translation**: Uses OpenAI GPT-4o-mini to translate product descriptions and summaries
- **Database Persistence**: SQLite database for storing content and translations with full history
- **Real-time Updates**: WebSocket integration for live console logs and progress tracking
- **Multi-Language Support**: Supports 40+ languages including Arabic, Chinese, Japanese, Korean, and more
- **Smart Validation**: Length-based validation system that works reliably with non-English characters
- **Translation Caching**: Efficient database caching system to avoid re-translating content
- **Batch Operations**: Translate, update, and validate multiple languages simultaneously
- **Error Handling**: Robust error handling with detailed logging and retry mechanisms
- **Progress Tracking**: Real-time progress updates and comprehensive reporting

## 📋 Supported Languages

- English (en-US)
- Arabic (ar-SA)
- Bulgarian (bg-BG)
- Chinese Simplified (zh-CN)
- Chinese Traditional (zh-TW)
- Croatian (hr-HR)
- Czech (cs-CZ)
- Danish (da-DK)
- Dutch (nl-NL)
- Estonian (et-EE)
- Finnish (fi-FI)
- French (fr-FR)
- German (de-DE)
- Greek (el-GR)
- Hebrew (he-IL)
- Hungarian (hu-HU)
- Indonesian (id-ID)
- Italian (it-IT)
- Japanese (ja-JP)
- Korean (ko-KR)
- Latvian (lv-LV)
- Lithuanian (lt-LT)
- Norwegian (nb-NO)
- Polish (pl-PL)
- Portuguese Brazil (pt-BR)
- Portuguese Portugal (pt-PT)
- Romanian (ro-RO)
- Russian (ru-RU)
- Serbian Latin (sr-Latn-RS)
- Slovak (sk-SK)
- Slovenian (sl-SI)
- Spanish (es-ES)
- Swedish (sv-SE)
- Thai (th-TH)
- Turkish (tr-TR)
- Ukrainian (uk-UA)
- Vietnamese (vi-VN)

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or higher)
- Google Chrome browser
- Microsoft 365 Partner Center account
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/appsdowonders/appsource-listing-updater
   cd appsource-listing-updater
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```

4. **Set up configuration**
   ```bash
   # Copy the example configuration file
   cp config.example.js config.js
   
   # Edit the configuration with your details
   nano config.js
   ```

5. **Configure your details**
   Edit `config.js` with your information:
   ```javascript
   module.exports = {
     // Microsoft credentials
     MICROSOFT_EMAIL: 'your-email@domain.com',
     MICROSOFT_PASSWORD: 'your-password',
     
     // OpenAI API key
     OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-openai-api-key',
     
     // Other settings...
   };
   ```

## 🚀 Usage

### Web Console Interface (Recommended)

1. **Start the web console**
   ```bash
   npm run console
   ```

2. **Open your browser**
   Navigate to `http://localhost:3000`

3. **Use the web interface**
   - Add/edit your English content
   - Select languages to translate
   - Execute batch operations
   - Monitor real-time progress

### CLI Automation Script

```bash
node update-listing.js
```

### What the tool does

1. **Content Management**: Store and manage English product content in database
2. **Translation**: Use OpenAI to translate content to multiple languages
3. **Automation**: Automatically log into Microsoft Partner Center
4. **Form Filling**: Fill summary and description fields for each language
5. **Validation**: Verify that translations were saved correctly
6. **Progress Tracking**: Real-time updates and comprehensive reporting

### Console Output Example

```
Reading English listing data...
English data loaded: { name: 'Grok for Excel', summary: 'Best AI Excel Assistant...', description: '...' }

Starting Microsoft login process...
✅ Login completed successfully

=== Processing language: English (en-US) ===
Selecting language: English
⏳ Waiting for page to fully load...
Successfully selected language: English
Using original English content (no translation needed)
💾 Cached translation for en-US
[OK] English: Your changes were saved.

=== Processing language: Arabic (ar-SA) ===
Selecting language: Arabic
Successfully selected language: Arabic
🔄 Starting OpenAI translation to ar-SA...
✅ OpenAI API response received in 1200ms
💾 Cached translation for ar-SA
[OK] Arabic: Your changes were saved.

🔍 ===== STARTING VALIDATION WORKFLOW =====
💾 Using cached translations only - no API calls will be made
🎯 Validating only 25 successfully processed languages

--- Validating English (en-US) ---
📋 Retrieved cached translation for validation: en-US
✅ English: Validation PASSED

--- Validating Arabic (ar-SA) ---
📋 Retrieved cached translation for validation: ar-SA
✅ Arabic: Validation PASSED

📊 FINAL VALIDATION SUMMARY:
🎯 Languages processed initially: 25
🔍 Languages validated: 25
✅ Successful validations: 25/25
❌ Failed validations: 0/25
💾 All validations used cached translations (no re-translation)
```

## ⚙️ Configuration

### Configuration Files

The tool uses a centralized configuration system:

- **`config.js`** - Your actual configuration (not in version control)
- **`config.example.js`** - Template configuration file (in version control)
- **`database.js`** - SQLite database management
- **`product_content.db`** - SQLite database file (created automatically)

### Setting Up Configuration

1. **Copy the example configuration:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit `config.js` with your details:**
   ```javascript
   module.exports = {
     // Microsoft credentials
     MICROSOFT_EMAIL: 'your-email@domain.com',
     MICROSOFT_PASSWORD: 'your-password',
     
     // OpenAI API key
     OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key',
     
     // URLs
     LOGIN_URL: 'https://partner.microsoft.com/_login?authType=OpenIdConnect',
     DASHBOARD_URL: 'https://partner.microsoft.com/en-us/dashboard/marketplace-offers/overview',
     
     // Language filtering
     LANGUAGE_FILTER: {
       enabled: false,
       include: [],
       exclude: []
     },
     
     // Validation settings
     VALIDATION: {
       enabled: false,
       timeout: 15_000
     }
   };
   ```

3. **Add your content through the web interface**
   - Start the console: `npm run console`
   - Navigate to `http://localhost:3000`
   - Add your product name, summary, and description

### Translation Settings

The tool uses OpenAI's GPT-4o-mini model with these settings:

```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  max_tokens: 10000,
  temperature: 0.3
});
```

### Validation Settings

Length-based validation with configurable tolerance:

```javascript
const lengthTolerance = 5; // Allow up to 5 characters difference
```

## 🔧 Advanced Features

### Database Persistence

The tool uses SQLite for persistent storage:

- **Product Content**: Store English content with version history
- **Translations**: Cache all translations with timestamps
- **Automatic Cleanup**: Database is created automatically on first run

### Web Console Features

- **Real-time Updates**: WebSocket integration for live progress tracking
- **Content Preview**: View translations in both HTML and preview modes
- **Batch Operations**: Select multiple languages for simultaneous processing
- **Status Tracking**: Real-time status indicators for all operations
- **Field Configuration**: Toggle which fields to update (summary/description)

### Smart Validation

Uses length-based validation that works reliably with all languages:

```javascript
const summaryValid = Math.abs(currentSummaryLength - expectedSummaryLength) <= lengthTolerance;
const descriptionValid = Math.abs(currentDescriptionLength - expectedDescriptionLength) <= lengthTolerance;
```

### Error Handling

Comprehensive error handling with retry mechanisms:

- Automatic retry for failed validations
- Detailed error logging with real-time console updates
- Graceful handling of missing languages
- Network timeout handling
- Database transaction safety

## 📊 Monitoring and Logging

### Web Console Monitoring

The web console provides comprehensive monitoring:

- **Real-time Console Logs**: Live updates via WebSocket
- **Progress Tracking**: Visual progress indicators for all operations
- **Status Management**: Real-time status for translate/update/validate operations
- **Cache Monitoring**: View cached translations and clear cache
- **Error Reporting**: Detailed error messages with context

### CLI Logging

The CLI script provides detailed console output:

- **Processing Status**: Step-by-step progress updates
- **Translation Progress**: API response times and token usage
- **Validation Results**: Detailed validation reports
- **Performance Metrics**: Execution time and success rates

### Log Levels

- **INFO**: General progress updates
- **SUCCESS**: Successful operations (✅)
- **WARNING**: Non-critical issues (⚠️)
- **ERROR**: Error messages and stack traces (❌)

## 🐛 Troubleshooting

### Common Issues

1. **Web Console Issues**
   - **Port Already in Use**: Change PORT environment variable or kill existing process
   - **Database Errors**: Delete `product_content.db` to reset database
   - **Translation Failures**: Check OpenAI API key and internet connection
   - **Content Not Loading**: Ensure you've added content through the web interface

2. **CLI Script Issues**
   - **Login Failed**: Check Microsoft credentials and 2FA settings
   - **Translation Errors**: Verify OpenAI API key and API quota
   - **Validation Failures**: Check if languages are available on the page
   - **Browser Issues**: Update Chrome browser and check permissions

3. **Database Issues**
   - **Corrupted Database**: Delete `product_content.db` to reset
   - **Permission Errors**: Check file permissions in project directory
   - **Migration Issues**: Database schema is created automatically

4. **API Issues**
   - **OpenAI Rate Limits**: Check API usage and billing
   - **Network Timeouts**: Ensure stable internet connection
   - **Authentication Errors**: Verify API key is correct and active

### Debug Mode

Enable detailed debugging by modifying the validation function:

```javascript
// Add more detailed logging
console.log(`🔍 DEBUG - ${languageName} Validation Details:`);
console.log(`📏 Current Summary Length: ${currentSummaryLength}`);
console.log(`📏 Expected Summary Length: ${expectedSummaryLength}`);
```

## 🔒 Security

### Credential Management

- Store sensitive credentials in environment variables
- Never commit API keys to version control
- Use secure password storage

### API Security

- Rotate OpenAI API keys regularly
- Monitor API usage and costs
- Use least-privilege access


## 📁 Project Structure

```
appsource-listing-updater/
├── server.js              # Express server with API endpoints
├── update-listing.js      # CLI automation script
├── database.js            # SQLite database management
├── config.js              # Configuration file (not in version control)
├── config.example.js      # Example configuration
├── package.json           # Dependencies and scripts
├── product_content.db     # SQLite database (created automatically)
├── public/
│   └── index.html         # React web console interface
├── chrome-profile/        # Chrome user data directory
└── README.md              # This file
```

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/appsdowonders/appsource-listing-updater
   cd appsource-listing-updater
   npm install
   ```

2. **Configure**
   ```bash
   cp config.example.js config.js
   # Edit config.js with your credentials
   ```

3. **Start web console**
   ```bash
   npm run console
   # Open http://localhost:3000
   ```

4. **Add content and translate**
   - Add your product content in the web interface
   - Select languages to translate
   - Execute batch operations

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Twistly.ai](https://twistly.ai/) - AI Presentation Maker for creating this automation tool
- OpenAI for providing the translation API
- Selenium WebDriver for browser automation
- Microsoft Partner Center for the platform
- The open-source community for various dependencies

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [Issues](https://github.com/appsdowonders/appsource-listing-updater/issues)
3. Create a new issue with detailed information
4. Contact the maintainers

## 📚 Additional Resources

- [Microsoft Partner Center Documentation](https://docs.microsoft.com/en-us/partner-center/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Selenium WebDriver Documentation](https://selenium-python.readthedocs.io/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Note**: This tool is designed for legitimate use with your own Microsoft 365 add-ins. Please ensure you have proper authorization and follow Microsoft's terms of service.
