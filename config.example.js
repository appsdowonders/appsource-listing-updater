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
  
  // File paths
  DESCRIPTION_FILE_PATH: './description.txt',
  
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
    `${process.env.USERPROFILE}/AppData/Local/Google/Chrome/User Data/Default`
};
