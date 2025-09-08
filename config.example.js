// Example configuration file for Microsoft 365 Add-in Listing Translation Tool
// Copy this file to config.js and update with your actual values

module.exports = {
  // Product listing constants
  PRODUCT_NAME: 'Your Addin Name',
  PRODUCT_SUMMARY: 'Your addin summary',
  
  // Microsoft credentials
  MICROSOFT_EMAIL: 'your-email@domain.com',
  MICROSOFT_PASSWORD: 'your-password',
  
  // OpenAI configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
  
  
  // URLs (usually don't need to change these)
  LOGIN_URL: 'https://partner.microsoft.com/_login?authType=OpenIdConnect',
  DASHBOARD_URL: 'https://partner.microsoft.com/en-us/dashboard/marketplace-offers/overview',
  
  // Timeouts and delays (in milliseconds)
  PAGE_READY_TIMEOUT: 60_000,
  SAVE_WAIT_SECONDS: 20_000,
  AFTER_SAVE_DELAY: 1_000,
  
  // Validation settings
  LENGTH_TOLERANCE: 5, // Allow up to 5 characters difference in validation
  
  // Chrome profile path (automatically detects OS)
  CHROME_PROFILE_PATH: process.env.HOME ? 
    `${process.env.HOME}/Library/Application Support/Google/Chrome/Default` :
    `${process.env.USERPROFILE}/AppData/Local/Google/Chrome/User Data/Default`,
  
  // Field update configuration
  UPDATE_FIELDS: {
    summary: true,      // Update the summary field
    description: true,  // Update the description field
    // Add more fields here as needed
  },
  
  // Language filtering configuration
  LANGUAGE_FILTER: {
    enabled: false,     // Set to true to enable language filtering
    include: [],        // Array of language codes to include (empty = include all)
    exclude: [],        // Array of language codes to exclude
    // Example: include: ['en-US', 'es-ES', 'fr-FR'] - only process these languages
    // Example: exclude: ['ar-SA', 'he-IL'] - process all except these languages
  },
  
  // Validation configuration
  VALIDATION: {
    enabled: true,      // Set to false to skip validation after all languages are updated
    timeout: 30_000,    // Timeout for validation operations (in milliseconds)
  },
  
  // Supported languages for translation (modify this list as needed)
  SUPPORTED_LANGUAGES: [
    { code: 'en-US', name: 'English' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'bg-BG', name: 'Bulgarian' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'hr-HR', name: 'Croatian' },
    { code: 'cs-CZ', name: 'Czech' },
    { code: 'da-DK', name: 'Danish' },
    { code: 'nl-NL', name: 'Dutch' },
    { code: 'et-EE', name: 'Estonian' },
    { code: 'fi-FI', name: 'Finnish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'el-GR', name: 'Greek' },
    { code: 'he-IL', name: 'Hebrew' },
    { code: 'hu-HU', name: 'Hungarian' },
    { code: 'id-ID', name: 'Indonesian' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'lv-LV', name: 'Latvian' },
    { code: 'lt-LT', name: 'Lithuanian' },
    { code: 'nb-NO', name: 'Norwegian (Bokmål)' },
    { code: 'pl-PL', name: 'Polish' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
    { code: 'ro-RO', name: 'Romanian' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'sr-Latn-RS', name: 'Serbian (Latin)' },
    { code: 'sk-SK', name: 'Slovak' },
    { code: 'sl-SI', name: 'Slovenian' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'sv-SE', name: 'Swedish' },
    { code: 'th-TH', name: 'Thai' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'uk-UA', name: 'Ukrainian' },
    { code: 'vi-VN', name: 'Vietnamese' },
  ]
};
