# Microsoft 365 Add-in Listing Translation Tool

An automated tool for translating and updating Microsoft 365 add-in listings across multiple languages using Selenium WebDriver and OpenAI's GPT models.

## 🚀 Features

- **Automated Translation**: Uses OpenAI GPT-4o-mini to translate product descriptions and summaries
- **Multi-Language Support**: Supports 40+ languages including Arabic, Chinese, Japanese, Korean, and more
- **Smart Validation**: Length-based validation system that works reliably with non-English characters
- **Translation Caching**: Efficient caching system to avoid re-translating content during validation
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
   cd addin-selenium
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

5. **Create description file**
   ```bash
   # Copy the example description file
   cp description.example.txt description.txt
   
   # Edit with your product description
   nano description.txt
   ```

6. **Configure your details**
   Edit `config.js` with your information:
   ```javascript
   PRODUCT_NAME: 'Your Product Name',
   PRODUCT_SUMMARY: 'Your product summary',
   MICROSOFT_EMAIL: 'your-email@domain.com',
   MICROSOFT_PASSWORD: 'your-password',
   OPENAI_API_KEY: 'your-openai-api-key',
   ```

## 🚀 Usage

### Basic Usage

```bash
node update-listing.js
```

### What the tool does

1. **Login**: Automatically logs into Microsoft Partner Center
2. **Navigate**: Goes to your product's marketplace listings
3. **Translate**: Translates content for each supported language
4. **Fill Forms**: Automatically fills summary and description fields
5. **Save**: Saves changes for each language
6. **Validate**: Validates that translations were saved correctly

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

The tool uses separate configuration files to keep sensitive information out of version control:

- **`config.js`** - Your actual configuration (not in version control)
- **`config.example.js`** - Template configuration file (in version control)
- **`description.txt`** - Your product description (not in version control)
- **`description.example.txt`** - Template description file (in version control)

### Setting Up Configuration

1. **Copy the example files:**
   ```bash
   cp config.example.js config.js
   cp description.example.txt description.txt
   ```

2. **Edit `config.js` with your details:**
   ```javascript
   module.exports = {
     // Product details
     PRODUCT_NAME: 'Your Product Name',
     PRODUCT_SUMMARY: 'Your product summary',
     
     // Microsoft credentials
     MICROSOFT_EMAIL: 'your-email@domain.com',
     MICROSOFT_PASSWORD: 'your-password',
     
     // OpenAI API key
     OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key',
     
     // Other settings...
   };
   ```

3. **Edit `description.txt` with your product description**

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

### Translation Caching

The tool automatically caches translations to avoid re-translating during validation:

```javascript
// Cache management
function cacheTranslation(languageCode, translatedData) { ... }
function getCachedTranslationForValidation(languageCode, englishData) { ... }
```

### Smart Validation

Uses length-based validation that works reliably with all languages:

```javascript
const summaryValid = Math.abs(currentSummaryLength - expectedSummaryLength) <= lengthTolerance;
const descriptionValid = Math.abs(currentDescriptionLength - expectedDescriptionLength) <= lengthTolerance;
```

### Error Handling

Comprehensive error handling with retry mechanisms:

- Automatic retry for failed validations
- Detailed error logging
- Graceful handling of missing languages
- Network timeout handling

## 📊 Monitoring and Logging

### Progress Tracking

The tool provides detailed progress updates:

- Real-time processing status
- Translation progress
- Validation results
- Error reporting
- Performance metrics

### Log Levels

- **INFO**: General progress updates
- **DEBUG**: Detailed validation information
- **ERROR**: Error messages and stack traces
- **SUCCESS**: Successful operations

## 🐛 Troubleshooting

### Common Issues

1. **Login Failed**
   - Check Microsoft credentials
   - Ensure 2FA is disabled or handle it manually
   - Verify Partner Center access

2. **Translation Errors**
   - Verify OpenAI API key
   - Check API quota and billing
   - Ensure stable internet connection

3. **Validation Failures**
   - Check if languages are available on the page
   - Verify form field selectors
   - Review length tolerance settings

4. **Browser Issues**
   - Update Chrome browser
   - Check Chrome profile permissions
   - Clear browser cache if needed

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
2. Search existing [Issues](https://github.com/yourusername/addin-selenium/issues)
3. Create a new issue with detailed information
4. Contact the maintainers

## 📚 Additional Resources

- [Microsoft Partner Center Documentation](https://docs.microsoft.com/en-us/partner-center/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Selenium WebDriver Documentation](https://selenium-python.readthedocs.io/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Note**: This tool is designed for legitimate use with your own Microsoft 365 add-ins. Please ensure you have proper authorization and follow Microsoft's terms of service.
