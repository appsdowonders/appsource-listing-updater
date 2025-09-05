// update_listings.js - Rewritten to match Playwright test scenario with OpenAI translation
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const OpenAI = require('openai');

// Load configuration
const config = require('./config');

// ====== CONFIG ======
const DESCRIPTION_FILE_PATH = config.DESCRIPTION_FILE_PATH;
const PRODUCT_NAME = config.PRODUCT_NAME;
const PRODUCT_SUMMARY = config.PRODUCT_SUMMARY;
const SUPPORTED_LANGUAGES = config.SUPPORTED_LANGUAGES;
const UPDATE_FIELDS = config.UPDATE_FIELDS;
const LANGUAGE_FILTER = config.LANGUAGE_FILTER;
const VALIDATION = config.VALIDATION;

// Translation cache to store translated content
const translationCache = new Map();

// Helper functions for configuration
function getFilteredLanguages() {
  if (!LANGUAGE_FILTER.enabled) {
    return SUPPORTED_LANGUAGES;
  }
  
  let filteredLanguages = SUPPORTED_LANGUAGES;
  
  // Apply include filter
  if (LANGUAGE_FILTER.include && LANGUAGE_FILTER.include.length > 0) {
    filteredLanguages = filteredLanguages.filter(lang => 
      LANGUAGE_FILTER.include.includes(lang.code)
    );
  }
  
  // Apply exclude filter
  if (LANGUAGE_FILTER.exclude && LANGUAGE_FILTER.exclude.length > 0) {
    filteredLanguages = filteredLanguages.filter(lang => 
      !LANGUAGE_FILTER.exclude.includes(lang.code)
    );
  }
  
  return filteredLanguages;
}

function shouldUpdateField(fieldName) {
  return UPDATE_FIELDS[fieldName] === true;
}

// Cache management functions
function cacheTranslation(languageCode, translatedData) {
  translationCache.set(languageCode, {
    summary: translatedData.summary,
    description: translatedData.description,
    timestamp: Date.now()
  });
  console.log(`💾 Cached translation for ${languageCode}`);
}

function getCachedTranslation(languageCode) {
  const cached = translationCache.get(languageCode);
  if (cached) {
    console.log(`📋 Retrieved cached translation for ${languageCode}`);
    return {
      summary: cached.summary,
      description: cached.description
    };
  }
  return null;
}

function getCachedTranslationForValidation(languageCode, englishData) {
  const cached = translationCache.get(languageCode);
  if (cached) {
    console.log(`📋 Retrieved cached translation for validation: ${languageCode}`);
    
    
    return {
      name: englishData.name, // Keep name in English for consistency
      summary: cached.summary,
      description: cached.description
    };
  }
  
  // If not cached, this is an error - we should have cached it during initial processing
  console.error(`❌ No cached translation found for ${languageCode} - this should not happen!`);
  throw new Error(`No cached translation found for ${languageCode}. Validation should only use cached translations.`);
}

function isTranslationCached(languageCode) {
  return translationCache.has(languageCode);
}

function getCacheStats() {
  return {
    totalCached: translationCache.size,
    languages: Array.from(translationCache.keys())
  };
}

// OpenAI configuration
const OPENAI_API_KEY = config.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Supported languages for translation

// Translation prompt for OpenAI
const TRANSLATION_PROMPT = `You are a professional localization engine. Translate human-readable text from the provided text into {target_language}.

Rules:
1. Do not add, remove, reorder, or rename any tags, attributes, or attributes.
2. Preserve whitespace exactly: spaces, newlines, tabs, indentation, and blank lines must remain unchanged.
3. Preserve all entities and punctuation as written (for example: , &, ©, -).
4. Translate only human-visible text nodes. Translate attribute values intended for users: alt, title, placeholder, aria-label.
5. Keep numbers, URLs, placeholders, and templating intact: {{...}}, #{...}, <%= %>, , %{...}, :em, :en.
6. Do not change code blocks or technical literals inside <code>, <pre>, <kbd>, <samp>, <var>, or <tt> tags.
7. Keep capitalization style (Title Case, ALL CAPS) where natural in the target language; otherwise follow target language conventions.
8. Maintain meaning and tone (formal vs. informal) consistent with the source.
9. Output only the translated markup, no explanations, no extra characters before or after.
10. The count and order of tags before and after must match exactly.

Extra guidance:
1. Translate visible UI text inside tags like <p>, <span>, <a>, <button>, <label>, <option>, <li>, <h1>-<h6>, <td>, <th>, <div>.
2. If a sentence spans inline tags (for example, <strong>, <em>, <b>, <i>, <u>, <sup>, <sub>), translate the entire sentence and place the tags around the appropriate translated words.
3. For punctuation attached to tags, keep punctuation placement identical.
4. If a term is a product/brand name, leave it untranslated unless it has a common exonym in the target language.

Delivery:
Return the translated text with the same indentation and line breaks as the input. No commentary.

Text to translate: {text}`;

// Microsoft credentials
const MICROSOFT_EMAIL = config.MICROSOFT_EMAIL;
const MICROSOFT_PASSWORD = config.MICROSOFT_PASSWORD;

// URLs
const LOGIN_URL = config.LOGIN_URL;
const DASHBOARD_URL = config.DASHBOARD_URL;

// Chrome profile path and timeouts
const CHROME_PROFILE_PATH = config.CHROME_PROFILE_PATH;
const PAGE_READY_TIMEOUT = config.PAGE_READY_TIMEOUT;
const SAVE_WAIT_SECONDS = config.SAVE_WAIT_SECONDS;
const AFTER_SAVE_DELAY = config.AFTER_SAVE_DELAY;
// =====================

async function buildDriver() {
  const options = new chrome.Options()
    // Use a unique user data directory to avoid conflicts
    .addArguments(`--user-data-dir=${path.join(__dirname, 'chrome-profile')}`)
    .addArguments('--start-maximized')
    .addArguments('--no-sandbox')
    .addArguments('--disable-dev-shm-usage');

  // To run headless, uncomment the next line:
  // options.addArguments('--headless=new');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Make page loads less likely to timeout on slow network
  await driver.manage().setTimeouts({ pageLoad: 120_000, script: 120_000, implicit: 0 });
  return driver;
}

async function performMicrosoftLogin(driver) {
  console.log('Starting Microsoft login process...');
  
  try {
    // Navigate to Microsoft login page
    console.log('Navigating to Microsoft login page...');
    await driver.get(LOGIN_URL);
    await driver.sleep(3000); // Wait for page to load
    
    // Check if we're still on a valid page
    const currentUrl = await driver.getCurrentUrl();
    console.log(`Current URL after navigation: ${currentUrl}`);
    
    if (!currentUrl.includes('login.microsoftonline.com') && !currentUrl.includes('microsoft.com')) {
      throw new Error(`Unexpected redirect to: ${currentUrl}`);
    }
    
    // Try for email input first
    console.log('Looking for email input...');
    try {
      // Wait for email input and fill it
      const emailInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@type='email' or @name='loginfmt']")),
        5_000
      );
      
      // Scroll to element and wait for it to be clickable
      await driver.executeScript("arguments[0].scrollIntoView(true);", emailInput);
      await driver.sleep(1000);
      
      // Try to click with JavaScript if regular click fails
      try {
        await emailInput.click();
      } catch (e) {
        console.log('Regular click failed, trying JavaScript click...');
        await driver.executeScript("arguments[0].click();", emailInput);
      }
      
      await emailInput.clear();
      await emailInput.sendKeys(MICROSOFT_EMAIL);
      console.log('Email entered');
    } catch (e) {
      console.log('No email input found, checking for account selection dialog...');
      
      // Check if we see "Pick an account" dialog
      try {
        // Look for account selection dialog
        const accountDialog = await driver.wait(
          until.elementLocated(By.xpath("//div[contains(text(), 'Pick an account') or contains(text(), 'Choose an account')]")),
          5_000
        );
        
        if (accountDialog) {
          console.log('Found account selection dialog, looking for email option...');
          // Look for the email address in the account list
          const emailOption = await driver.wait(
            until.elementLocated(By.xpath(`//div[contains(text(), '${MICROSOFT_EMAIL}') or contains(@data-testid, 'account')]//parent::*//parent::*`)),
            10_000
          );
          
          // Try to click the email option
          try {
            await emailOption.click();
          } catch (e) {
            console.log('Regular click failed, trying JavaScript click...');
            await driver.executeScript("arguments[0].click();", emailOption);
          }
          
          console.log('Selected account from dialog');
          await driver.sleep(1500); // Wait for page transition
        }
      } catch (e) {
        console.log('No account dialog found either, proceeding...');
      }
    }
    
    // Click Next button (only if we're not in account selection flow)
    console.log('Looking for Next button...');
    try {
      const nextButton = await driver.wait(
        until.elementLocated(By.xpath("//input[@type='submit' and @value='Next']")),
        5_000
      );
      
      // Try to click with JavaScript if regular click fails
      try {
        await nextButton.click();
      } catch (e) {
        console.log('Regular click failed, trying JavaScript click...');
        await driver.executeScript("arguments[0].click();", nextButton);
      }
      
          console.log('Next button clicked');
    await driver.sleep(2000); // Wait for page transition
    } catch (e) {
      console.log('No Next button found, might be in account selection flow or already past this step');
    }
    
    // Wait for password input and fill it
    console.log('Looking for password input...');
    const passwordInput = await driver.wait(
      until.elementLocated(By.xpath("//input[@type='password' or @name='passwd']")),
      30_000
    );
    await passwordInput.click();
    await passwordInput.clear();
    await passwordInput.sendKeys(MICROSOFT_PASSWORD);
    console.log('Password entered');
    
    // Click Sign in button
    console.log('Looking for Sign in button...');
    const signInButton = await driver.wait(
      until.elementLocated(By.xpath("//input[@type='submit' and @value='Sign in']")),
      10_000
    );
    await signInButton.click();
    console.log('Sign in button clicked');
    await driver.sleep(2000); // Wait for authentication
    
    // Handle "Stay signed in?" prompt
    try {
      console.log('Checking for "Stay signed in?" prompt...');
      const staySignedInHeading = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Stay signed in?')]")),
        10_000
      );
      if (staySignedInHeading) {
        const noButton = await driver.wait(
          until.elementLocated(By.xpath("//input[@type='button' and @value='No']")),
          5_000
        );
        await noButton.click();
        console.log('Clicked "No" on stay signed in prompt');
      }
    } catch (e) {
      console.log('No "Stay signed in?" prompt found, continuing...');
    }
    
    // Wait for redirect to dashboard
    console.log('Waiting for redirect to partner dashboard...');
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      console.log(`Current URL: ${url}`);
      return url.includes('partner.microsoft.com');
    }, 60_000);
    
    console.log('Login completed successfully');
  } catch (error) {
    console.error('Error during login:', error.message);
    const currentUrl = await driver.getCurrentUrl();
    console.log(`Current URL when error occurred: ${currentUrl}`);
    throw error;
  }
}

async function navigateToProductListings(driver) {
  console.log('Navigating to product listings...');
  
  // Navigate to dashboard
  await driver.get(DASHBOARD_URL);
  
  // Click on "Microsoft 365 and Copilot" section
  const m365Section = await driver.wait(
    until.elementLocated(By.xpath("//*[contains(text(), 'Microsoft 365 and Copilot')]")),
    60_000
  );
  await m365Section.click();
  
  // Click on product using PRODUCT_NAME constant
  const productLink = await driver.wait(
    until.elementLocated(By.xpath(`//a[contains(text(), '${PRODUCT_NAME}')]`)),
    60_000
  );
  await productLink.click();
  
  // Click on the language menu (Marketplace listings)
  const languageMenu = await driver.wait(
    until.elementLocated(By.xpath("//he-task-item[contains(text(), 'Marketplace listings')]")),
    30_000
  );
  await languageMenu.click();
  
  console.log('Successfully navigated to product listings');
}

async function navigateBackToMarketplaceListings(driver) {
  console.log('Clicking on Marketplace listings link...');
  
  // Click on the Marketplace listings link directly
  const marketplaceLink = await driver.wait(
    until.elementLocated(By.xpath("//he-task-item[contains(text(), 'Marketplace listings')]")),
    10_000
  );
  await marketplaceLink.click();
  
  console.log('Successfully navigated back to Marketplace listings');
}

async function selectLanguage(driver, languageName, isFirstLanguage = false) {
  console.log(`Selecting language: ${languageName}`);
  
  try {
    // Add initial delay only for the first language to allow page to fully load
    if (isFirstLanguage) {
      console.log('⏳ Waiting for page to fully load...');
      await driver.sleep(2000);
    }
    
    // Look for the language link in the table
    const languageLink = await driver.wait(
      until.elementLocated(By.xpath(`//a[contains(@href, 'languageid') and contains(text(), '${languageName}')]`)),
      10_000
    );
    
    // Click on the language link
    await languageLink.click();
    await driver.sleep(1000);
    console.log(`Successfully selected language: ${languageName}`);
    return true;
  } catch (error) {
    console.log(`❌ SKIPPED: Language '${languageName}' not found on the listing page`);
    return false;
  }
}

async function fillDescription(driver, descriptionText, summaryText) {
  console.log('Filling summary and description fields...');
  
  
  // Fill summary field (if configured to update)
  if (shouldUpdateField('summary')) {
    console.log('Filling summary field...');
    const summaryField = await driver.wait(
      until.elementLocated(By.css('textarea#shortDescription.form-control')),
      30_000
    );
    
    await summaryField.click();
    await driver.sleep(500);
    
    // Clear existing content
    await summaryField.sendKeys(Key.COMMAND, 'a');
    await summaryField.sendKeys(Key.DELETE);
    await driver.sleep(500);
    
    // Fill with new text
    await summaryField.sendKeys(summaryText);
    await driver.sleep(1000);
    
    // Debug: Verify what was actually filled
    const filledSummary = await summaryField.getAttribute('value') || await summaryField.getText() || '';
    
    console.log('Successfully filled summary field');
  } else {
    console.log('⏭️  Skipping summary field update (disabled in config)');
  }
  
  // Fill description field (if configured to update)
  if (shouldUpdateField('description')) {
    console.log('Filling description field...');
    const descField = await driver.wait(
      until.elementLocated(By.css('textarea#description.form-control')),
      30_000
    );
    
    await descField.click();
    await driver.sleep(500);
    
    // Clear existing content
    await descField.sendKeys(Key.COMMAND, 'a');
    await descField.sendKeys(Key.DELETE);
    await driver.sleep(500);
    
    // Fill with new text
    await descField.sendKeys(descriptionText);
    await driver.sleep(1000);
    
    console.log('Successfully filled description field');
  } else {
    console.log('⏭️  Skipping description field update (disabled in config)');
  }
}

async function clickSaveAndConfirm(driver) {
  console.log('Clicking Save button...');
  
  // Click Save button using the specific selector
  const saveBtn = await driver.wait(
    until.elementLocated(By.css('button[name="save_button"].btn.btn-primary')),
    SAVE_WAIT_SECONDS
  );
  await driver.wait(until.elementIsEnabled(saveBtn), 10_000);
  await saveBtn.click();

  console.log('Waiting for save confirmation...');
  
  // Wait for either confirmation message or 6 seconds, whichever comes first
  try {
    const confirmationMessage = await driver.wait(
      until.elementLocated(
        By.xpath("//*[contains(text(), 'Your changes were saved.')]")
      ),
      6_000  // Wait up to 6 seconds for the message
    );
    const messageText = await confirmationMessage.getText();
    console.log(`Save confirmation: ${messageText}`);
    return messageText;
  } catch (e) {
    console.log('Save confirmation message not found within 6 seconds, proceeding anyway');
    await driver.sleep(1000); // Brief pause before continuing
    return 'Save completed (confirmation timeout)';
  }
}

async function validateLanguageFields(driver, languageName, expectedSummary, expectedDescription, isFirstLanguage = false) {
  console.log(`🔍 Validating fields for ${languageName}...`);
  
  try {
    // Navigate to the language if not already there
    const languageSelected = await selectLanguage(driver, languageName, isFirstLanguage);
    if (!languageSelected) {
      return {
        success: false,
        error: `Language '${languageName}' not found on the listing page`,
        summaryValid: false,
        descriptionValid: false
      };
    }

    // Wait for page to load
    await driver.sleep(2000);

    // Get current values from the form fields
    const summaryField = await driver.wait(
      until.elementLocated(By.css('textarea#shortDescription.form-control')),
      VALIDATION.timeout
    );
    const descriptionField = await driver.wait(
      until.elementLocated(By.css('textarea#description.form-control')),
      VALIDATION.timeout
    );

    // Try multiple methods to get field values
    let currentSummary = await summaryField.getAttribute('value') || '';
    let currentDescription = await descriptionField.getAttribute('value') || '';
    
    // If value attribute is empty, try getting text content
    if (!currentSummary) {
      currentSummary = await summaryField.getText() || '';
    }
    if (!currentDescription) {
      currentDescription = await descriptionField.getText() || '';
    }
    
 

    // Validate by content length instead of text comparison
    const currentSummaryLength = currentSummary.trim().length;
    const expectedSummaryLength = expectedSummary.trim().length;
    const currentDescriptionLength = currentDescription.trim().length;
    const expectedDescriptionLength = expectedDescription.trim().length;
    
    // Allow for small differences in length (configurable tolerance)
    const lengthTolerance = config.LENGTH_TOLERANCE;
    const summaryValid = Math.abs(currentSummaryLength - expectedSummaryLength) <= lengthTolerance;
    const descriptionValid = Math.abs(currentDescriptionLength - expectedDescriptionLength) <= lengthTolerance;

    const validationResult = {
      success: summaryValid && descriptionValid,
      summaryValid,
      descriptionValid,
      currentSummaryLength: currentSummaryLength,
      expectedSummaryLength: expectedSummaryLength,
      currentDescriptionLength: currentDescriptionLength,
      expectedDescriptionLength: expectedDescriptionLength,
      summaryLengthDifference: Math.abs(currentSummaryLength - expectedSummaryLength),
      descriptionLengthDifference: Math.abs(currentDescriptionLength - expectedDescriptionLength),
      currentSummary: currentSummary.substring(0, 100) + (currentSummary.length > 100 ? '...' : ''),
      currentDescription: currentDescription.substring(0, 100) + (currentDescription.length > 100 ? '...' : ''),
      expectedSummary: expectedSummary.substring(0, 100) + (expectedSummary.length > 100 ? '...' : ''),
      expectedDescription: expectedDescription.substring(0, 100) + (expectedDescription.length > 100 ? '...' : ''),
      error: null
    };

    // Add detailed debugging for failed validations
    if (!summaryValid || !descriptionValid) {
      console.log(`\n🔍 DEBUG - ${languageName} Length Validation Details:`);
      console.log(`📏 Current Summary Length: ${currentSummaryLength}`);
      console.log(`📏 Expected Summary Length: ${expectedSummaryLength}`);
      console.log(`📏 Summary Length Difference: ${Math.abs(currentSummaryLength - expectedSummaryLength)} (tolerance: ${lengthTolerance})`);
      console.log(`📏 Current Description Length: ${currentDescriptionLength}`);
      console.log(`📏 Expected Description Length: ${expectedDescriptionLength}`);
      console.log(`📏 Description Length Difference: ${Math.abs(currentDescriptionLength - expectedDescriptionLength)} (tolerance: ${lengthTolerance})`);
      
      if (!summaryValid) {
        console.log(`❌ Summary Length Mismatch:`);
        console.log(`   Current: ${currentSummaryLength} characters`);
        console.log(`   Expected: ${expectedSummaryLength} characters`);
        console.log(`   Difference: ${Math.abs(currentSummaryLength - expectedSummaryLength)} characters`);
        console.log(`   Tolerance: ${lengthTolerance} characters`);
        validationResult.error = `Summary length mismatch for ${languageName} (${currentSummaryLength} vs ${expectedSummaryLength})`;
      }
      
      if (!descriptionValid) {
        console.log(`❌ Description Length Mismatch:`);
        console.log(`   Current: ${currentDescriptionLength} characters`);
        console.log(`   Expected: ${expectedDescriptionLength} characters`);
        console.log(`   Difference: ${Math.abs(currentDescriptionLength - expectedDescriptionLength)} characters`);
        console.log(`   Tolerance: ${lengthTolerance} characters`);
        if (!summaryValid) {
          validationResult.error += ` and Description length mismatch for ${languageName} (${currentDescriptionLength} vs ${expectedDescriptionLength})`;
        } else {
          validationResult.error = `Description length mismatch for ${languageName} (${currentDescriptionLength} vs ${expectedDescriptionLength})`;
        }
      }
    }

    return validationResult;

  } catch (error) {
    console.error(`❌ Error validating ${languageName}:`, error.message);
    return {
      success: false,
      error: `Validation failed: ${error.message}`,
      summaryValid: false,
      descriptionValid: false
    };
  }
}

async function performValidationWorkflow(driver, englishData, processedLanguages) {
  console.log('\n🔍 ===== STARTING VALIDATION WORKFLOW =====');
  console.log('💾 Using cached translations only - no API calls will be made');
  console.log(`🎯 Validating only ${processedLanguages.length} successfully processed languages`);
  
  const validationResults = [];
  const failedLanguages = [];
  
  // Check cache status before validation
  const cacheStats = getCacheStats();
  console.log(`📊 Cache status: ${cacheStats.totalCached} translations cached`);
  
  // Navigate back to Marketplace listings for validation
  await navigateBackToMarketplaceListings(driver);
  
  for (let i = 0; i < processedLanguages.length; i++) {
    const language = processedLanguages[i];
    const isFirstLanguage = i === 0;
    
    console.log(`\n--- Validating ${language.name} (${language.code}) ---`);
    
    try {
      // Get expected content from cache only (no translation logic)
      const expectedData = getCachedTranslationForValidation(language.code, englishData);
      
      // Validate the fields
      const validationResult = await validateLanguageFields(
        driver, 
        language.name, 
        expectedData.summary, 
        expectedData.description,
        isFirstLanguage
      );
      
      validationResult.language = language.name;
      validationResult.languageCode = language.code;
      validationResults.push(validationResult);
      
      if (validationResult.success) {
        console.log(`✅ ${language.name}: Validation PASSED`);
      } else {
        console.log(`❌ ${language.name}: Validation FAILED - ${validationResult.error}`);
        failedLanguages.push({
          language: language.name,
          code: language.code,
          error: validationResult.error,
          summaryValid: validationResult.summaryValid,
          descriptionValid: validationResult.descriptionValid
        });
      }
      
      // Navigate back to Marketplace listings for next validation
      if (language !== processedLanguages[processedLanguages.length - 1]) {
        await navigateBackToMarketplaceListings(driver);
        await driver.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error during validation of ${language.name}:`, error.message);
      validationResults.push({
        language: language.name,
        languageCode: language.code,
        success: false,
        error: `Validation error: ${error.message}`,
        summaryValid: false,
        descriptionValid: false
      });
      failedLanguages.push({
        language: language.name,
        code: language.code,
        error: `Validation error: ${error.message}`,
        summaryValid: false,
        descriptionValid: false
      });
    }
  }
  
  // Generate validation report
  console.log('\n📊 ===== VALIDATION REPORT =====');
  console.log(`Total languages processed: ${validationResults.length}`);
  console.log(`Successful validations: ${validationResults.filter(r => r.success).length}`);
  console.log(`Failed validations: ${failedLanguages.length}`);
  
  if (failedLanguages.length > 0) {
    console.log('\n❌ FAILED VALIDATIONS:');
    failedLanguages.forEach(failed => {
      console.log(`   - ${failed.language} (${failed.code}): ${failed.error}`);
      if (!failed.summaryValid) console.log(`     Summary field validation failed`);
      if (!failed.descriptionValid) console.log(`     Description field validation failed`);
    });
    
    // Optionally retry failed validations
    console.log('\n🔄 Attempting to retry failed validations...');
    for (const failed of failedLanguages) {
      console.log(`\n--- Retrying ${failed.language} ---`);
      try {
        const language = processedLanguages.find(l => l.name === failed.language);
        if (language) {
          // Use cached translation for retry (no translation logic)
          const expectedData = getCachedTranslationForValidation(language.code, englishData);
          const retryResult = await validateLanguageFields(
            driver, 
            failed.language, 
            expectedData.summary, 
            expectedData.description
          );
          
          if (retryResult.success) {
            console.log(`✅ ${failed.language}: Retry validation PASSED`);
            // Update the original result
            const originalResult = validationResults.find(r => r.language === failed.language);
            if (originalResult) {
              Object.assign(originalResult, retryResult);
            }
          } else {
            console.log(`❌ ${failed.language}: Retry validation FAILED - ${retryResult.error}`);
          }
        }
        
        // Navigate back for next retry
        if (failed !== failedLanguages[failedLanguages.length - 1]) {
          await navigateBackToMarketplaceListings(driver);
          await driver.sleep(1000);
        }
      } catch (error) {
        console.error(`❌ Error during retry of ${failed.language}:`, error.message);
      }
    }
  } else {
    console.log('\n🎉 All validations passed successfully!');
  }
  
  console.log('\n✅ ===== VALIDATION WORKFLOW COMPLETED =====');
  return validationResults;
}

function readEnglishListingData() {
  // Read description from text file
  const description = fs.readFileSync(DESCRIPTION_FILE_PATH, 'utf8').trim();
  
  if (!description) {
    throw new Error('Description file is empty. Add content to description.txt');
  }
  
  return {
    name: PRODUCT_NAME,
    summary: PRODUCT_SUMMARY,
    description: description
  };
}

async function translateText(text, targetLanguage) {
  try {
    console.log(`🔄 Starting OpenAI translation to ${targetLanguage}...`);
    
    const prompt = TRANSLATION_PROMPT
      .replace('{target_language}', targetLanguage)
      .replace('{text}', text);
    
    console.log(`🎯 Target language: ${targetLanguage}`);
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in software and technology content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 10000,
      temperature: 0
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ OpenAI API response received in ${duration}ms`);
    //console.log(`📊 Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);
    //console.log(`💰 Estimated cost: $${((completion.usage?.total_tokens || 0) * 0.00015 / 1000).toFixed(6)}`);
    
    const translatedText = completion.choices[0].message.content.trim();
    //console.log(`📝 Translated text length: ${translatedText.length} characters`);
    //console.log(`✅ Translation completed for ${targetLanguage}`);
    
    return translatedText;
  } catch (error) {
    console.error(`❌ Error translating to ${targetLanguage}:`, error.message);
    console.error(`🔍 Error details:`, error);
    throw error;
  }
}

async function translateListingData(englishData, languageCode, useCache = true) {
  if (languageCode === 'en-US') {
    console.log('Using original English content (no translation needed)');
    const englishDataWithName = {
      name: englishData.name, // Keep name in English for consistency
      summary: englishData.summary,
      description: englishData.description
    };
    
    // Cache English content too for consistency
    if (useCache) {
      cacheTranslation(languageCode, englishDataWithName);
    }
    
    return englishDataWithName;
  }
  
  // Check cache first if useCache is enabled
  if (useCache && isTranslationCached(languageCode)) {
    const cached = getCachedTranslation(languageCode);
    return {
      name: englishData.name, // Keep name in English for consistency
      summary: cached.summary,
      description: cached.description
    };
  }
  
  console.log(`\n=== Translating listing data to ${languageCode} ===`);
  
  // Only translate fields that will be updated
  const translationPromises = [];
  const translatedData = {
    name: englishData.name, // Keep name in English for consistency
    summary: englishData.summary, // Default to original
    description: englishData.description // Default to original
  };
  
  if (shouldUpdateField('summary')) {
    console.log('🔄 Translating summary...');
    translationPromises.push(
      translateText(englishData.summary, languageCode).then(result => {
        translatedData.summary = result;
      })
    );
  } else {
    console.log('⏭️  Skipping summary translation (disabled in config)');
  }
  
  if (shouldUpdateField('description')) {
    console.log('🔄 Translating description...');
    translationPromises.push(
      translateText(englishData.description, languageCode).then(result => {
        translatedData.description = result;
      })
    );
  } else {
    console.log('⏭️  Skipping description translation (disabled in config)');
  }
  
  // Wait for all translations to complete
  if (translationPromises.length > 0) {
    await Promise.all(translationPromises);
  }
  
  // Cache the translation
  if (useCache) {
    cacheTranslation(languageCode, translatedData);
  }
  
  return translatedData;
}

// Global start time for timing
let scriptStartTime;

async function main() {
  scriptStartTime = Date.now();
  console.log('Starting AppSource listing update process...');
  
  // Display configuration
  console.log('\n📋 Configuration:');
  console.log(`   Field updates: Summary=${shouldUpdateField('summary')}, Description=${shouldUpdateField('description')}`);
  console.log(`   Language filtering: ${LANGUAGE_FILTER.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   Validation: ${VALIDATION.enabled ? 'Enabled' : 'Disabled'}`);
  if (LANGUAGE_FILTER.enabled) {
    if (LANGUAGE_FILTER.include.length > 0) {
      console.log(`   Include languages: ${LANGUAGE_FILTER.include.join(', ')}`);
    }
    if (LANGUAGE_FILTER.exclude.length > 0) {
      console.log(`   Exclude languages: ${LANGUAGE_FILTER.exclude.join(', ')}`);
    }
  }
  
  // Step 1: Read English listing data from CSV
  console.log('Reading English listing data...');
  const englishData = readEnglishListingData();
  console.log('English data loaded:', {
    name: englishData.name,
    summary: englishData.summary.substring(0, 50) + '...',
    description: englishData.description.substring(0, 50) + '...',
    keywords: englishData.keywords
  });

  const driver = await buildDriver();
  const skippedLanguages = [];
  const processedLanguages = []; // Track successfully processed languages
  
  try {
    // Step 2: Perform Microsoft login
    await performMicrosoftLogin(driver);
    
    // Step 3: Navigate to product listings
    await navigateToProductListings(driver);

    // Step 4: Process each supported language (with filtering)
    const languagesToProcess = getFilteredLanguages();
    console.log(`📋 Processing ${languagesToProcess.length} languages (${LANGUAGE_FILTER.enabled ? 'filtered' : 'all'})`);
    
    for (let i = 0; i < languagesToProcess.length; i++) {
      const language = languagesToProcess[i];
      const isFirstLanguage = i === 0;
      
      console.log(`\n=== Processing language: ${language.name} (${language.code}) ===`);
      
      // First check if the language is available on the page
      const languageSelected = await selectLanguage(driver, language.name, isFirstLanguage);
      
      if (!languageSelected) {
        skippedLanguages.push(language.name);
        continue; // Skip to next language without translating
      }
      
      // Only translate if language is available
      console.log(`Language found, translating content...`);
      const listingData = await translateListingData(englishData, language.code);
      
      // Debug: Log what we're about to fill
      console.log(`🔍 DEBUG - Translation results for ${language.name}:`);
      console.log(`   Summary preview: ${listingData.summary.substring(0, 100)}...`);
      
      // Fill the summary and description with translated content
      await fillDescription(driver, listingData.description, listingData.summary);
      
      // Save and confirm
      const conf = await clickSaveAndConfirm(driver);
      console.log(`[OK] ${language.name}: ${conf}`);
      
      // Track this language as successfully processed
      processedLanguages.push({
        name: language.name,
        code: language.code
      });
      
      // Navigate back to Marketplace listings page for next language
      console.log('Navigating back to Marketplace listings...');
      await navigateBackToMarketplaceListings(driver);
      
      // Wait a bit before processing next language
      await driver.sleep(2000);
    }

    // Step 5: Perform validation workflow (if enabled)
    if (VALIDATION.enabled) {
      console.log('\n🔍 Starting validation workflow...');
      
      // Validate cache before starting validation
      const finalCacheStats = getCacheStats();
      console.log(`📊 Final cache status: ${finalCacheStats.totalCached} translations cached`);
      console.log(`📋 Cached languages: ${finalCacheStats.languages.join(', ')}`);
      console.log(`✅ Successfully processed languages: ${processedLanguages.length}`);
      console.log(`📋 Processed languages: ${processedLanguages.map(l => l.name).join(', ')}`);
      
      const validationResults = await performValidationWorkflow(driver, englishData, processedLanguages);
      
      // Log final validation summary
      const successfulValidations = validationResults.filter(r => r.success).length;
      const totalValidations = validationResults.length;
      
      console.log(`\n📊 FINAL VALIDATION SUMMARY:`);
      console.log(`🎯 Languages processed initially: ${processedLanguages.length}`);
      console.log(`🔍 Languages validated: ${totalValidations}`);
      console.log(`✅ Successful validations: ${successfulValidations}/${totalValidations}`);
      console.log(`❌ Failed validations: ${totalValidations - successfulValidations}/${totalValidations}`);
      console.log(`💾 All validations used cached translations (no re-translation)`);
    } else {
      console.log('\n⏭️  Skipping validation workflow (disabled in config)');
      console.log(`✅ Successfully processed ${processedLanguages.length} languages without validation`);
    }
    
  } finally {
    // Log summary of skipped languages
    if (skippedLanguages.length > 0) {
      console.log(`\n📋 SUMMARY: Skipped ${skippedLanguages.length} languages:`);
      skippedLanguages.forEach(lang => console.log(`   - ${lang}`));
    } else {
      console.log('\n✅ All languages processed successfully!');
    }
    
    // Display total execution time
    const endTime = Date.now();
    const totalTime = endTime - scriptStartTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    const milliseconds = totalTime % 1000;
    
    console.log(`\n⏱️  Total execution time: ${minutes}m ${seconds}s ${milliseconds}ms`);
    
    console.log('\nAll done. Closing browser in 3 seconds…');
    await new Promise((r) => setTimeout(r, 3000));
    await driver.quit();
  }
}

main().catch((err) => {
  const endTime = Date.now();
  const totalTime = endTime - scriptStartTime;
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);
  const milliseconds = totalTime % 1000;
  
  console.error('\nERROR:', err);
  console.error(`\n⏱️  Script failed after: ${minutes}m ${seconds}s ${milliseconds}ms`);
  process.exit(1);
});
