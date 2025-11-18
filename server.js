const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { Server } = require('socket.io');
const http = require('http');
const Database = require('./database');

// Load configuration
const config = require('./config');

// Default field update configuration (can be overridden via web console)
const DEFAULT_UPDATE_FIELDS = {
  summary: true,      // Update the summary field
  description: true,  // Update the description field
  keywords: true,    // Update the keywords fields
};

// Initialize field configuration from config file or use defaults
if (!config.UPDATE_FIELDS) {
  config.UPDATE_FIELDS = DEFAULT_UPDATE_FIELDS;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// Translation cache (now using database instead of memory cache)
// const translationCache = new Map(); // Deprecated - using database now

// Console log buffer for real-time updates
const consoleLogs = [];
const MAX_LOGS = 100; // Keep last 100 logs

// Function to add log and emit to clients
function addLog(message, type = 'info') {
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    message: message,
    type: type // 'info', 'success', 'error', 'warning'
  };
  
  consoleLogs.push(logEntry);
  
  // Keep only the last MAX_LOGS entries
  if (consoleLogs.length > MAX_LOGS) {
    consoleLogs.shift();
  }
  
  // Emit to all connected clients
  io.emit('console-log', logEntry);
}

// Translation prompt for description (complex HTML content)
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

// Simple translation prompt for summary (plain text, 100 char limit)
const SUMMARY_TRANSLATION_PROMPT = `Translate the following text to {target_language}. 

IMPORTANT RULES:
- Return ONLY plain text (no HTML, no special characters, no formatting)
- Maximum 100 characters
- Keep the meaning and tone
- If the text is too long, make it shorter while keeping the key message
- Do not add explanations or extra text

Text to translate: {text}`;

// Simple translation prompt for keywords (plain text, 40 char limit)
const KEYWORD_TRANSLATION_PROMPT = `Translate the following search keyword to {target_language}. 

IMPORTANT RULES:
- Return ONLY plain text (no HTML, no special characters, no formatting)
- Maximum 40 characters
- Keep it concise and search-friendly
- Translate naturally while maintaining search relevance
- Do not add explanations or extra text
- If it's a brand name or proper noun, you may keep it in English if appropriate

Text to translate: {text}`;

// Helper functions
function shouldUpdateField(fieldName) {
  return config.UPDATE_FIELDS[fieldName] === true;
}

async function readEnglishListingData() {
  try {
    const content = await db.getProductContent();
    
    if (!content) {
      throw new Error('No product content found in database. Please add content through the web interface.');
    }
    
    return content;
  } catch (error) {
    console.error('Error reading English listing data:', error);
    throw error;
  }
}


function getFilteredLanguages() {
  if (!config.LANGUAGE_FILTER.enabled) {
    return config.SUPPORTED_LANGUAGES;
  }
  
  let filteredLanguages = config.SUPPORTED_LANGUAGES;
  
  if (config.LANGUAGE_FILTER.include && config.LANGUAGE_FILTER.include.length > 0) {
    filteredLanguages = filteredLanguages.filter(lang => 
      config.LANGUAGE_FILTER.include.includes(lang.code)
    );
  }
  
  if (config.LANGUAGE_FILTER.exclude && config.LANGUAGE_FILTER.exclude.length > 0) {
    filteredLanguages = filteredLanguages.filter(lang => 
      !config.LANGUAGE_FILTER.exclude.includes(lang.code)
    );
  }
  
  return filteredLanguages;
}

async function translateText(text, targetLanguage, fieldType = 'description') {
  try {
    // Use different prompts based on field type
    let prompt;
    if (fieldType === 'summary') {
      prompt = SUMMARY_TRANSLATION_PROMPT;
    } else if (fieldType === 'keyword') {
      prompt = KEYWORD_TRANSLATION_PROMPT;
    } else {
      prompt = TRANSLATION_PROMPT;
    }
    
    const finalPrompt = prompt
      .replace('{target_language}', targetLanguage)
      .replace('{text}', text);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: fieldType === 'summary' 
            ? "You are a professional translator specializing in concise product summaries and marketing copy."
            : fieldType === 'keyword'
            ? "You are a professional translator specializing in search keywords and SEO terms."
            : "You are a professional translator specializing in software and technology content."
        },
        {
          role: "user",
          content: finalPrompt
        }
      ],
      max_tokens: fieldType === 'summary' ? 200 : fieldType === 'keyword' ? 100 : 10000,
      temperature: 0
    });
    
    let result = completion.choices[0].message.content.trim();
    
    // For summary, ensure it's plain text and within character limit
    if (fieldType === 'summary') {
      // Remove any HTML tags that might have been added
      result = result.replace(/<[^>]*>/g, '');
      // Remove any extra whitespace
      result = result.replace(/\s+/g, ' ').trim();
      // Truncate if still too long
      if (result.length > 100) {
        result = result.substring(0, 97) + '...';
      }
    }
    
    // For keywords, ensure it's plain text and within character limit
    if (fieldType === 'keyword') {
      // Remove any HTML tags that might have been added
      result = result.replace(/<[^>]*>/g, '');
      // Remove any extra whitespace
      result = result.replace(/\s+/g, ' ').trim();
      // Truncate if still too long
      if (result.length > 40) {
        result = result.substring(0, 37) + '...';
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error translating ${fieldType} to ${targetLanguage}:`, error.message);
    throw error;
  }
}

// API Routes

// Get English content
app.get('/api/content', async (req, res) => {
  try {
    const englishData = await readEnglishListingData();
    res.json({
      success: true,
      data: englishData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update English content
app.post('/api/content', async (req, res) => {
  try {
    const { name, summary, description, keyword1 = '', keyword2 = '', keyword3 = '' } = req.body;
    
    // Log received data for debugging
    console.log('Received content update:', {
      name: name ? 'present' : 'missing',
      summary: summary ? 'present' : 'missing',
      description: description ? 'present' : 'missing',
      keyword1: keyword1 || '(empty)',
      keyword2: keyword2 || '(empty)',
      keyword3: keyword3 || '(empty)'
    });
    
    // Validate required fields
    if (!name || !summary || !description) {
      return res.status(400).json({
        success: false,
        error: 'Product name, summary, and description are required'
      });
    }
    
    // Update database
    const result = await db.updateProductContent(name, summary, description, keyword1, keyword2, keyword3);
    
    console.log('Database update result:', {
      id: result.id,
      keyword1: result.keyword1 || '(empty)',
      keyword2: result.keyword2 || '(empty)',
      keyword3: result.keyword3 || '(empty)'
    });
    
    addLog(`✅ English content updated successfully in database`, 'success');
    
    res.json({
      success: true,
      message: 'Content updated successfully',
      data: {
        name,
        summary,
        description,
        keyword1,
        keyword2,
        keyword3,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    console.error('Error updating content:', error);
    addLog(`❌ Error updating content: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  try {
    const languages = getFilteredLanguages();
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get translation for a specific language
app.get('/api/translation/:languageCode', async (req, res) => {
  try {
    const { languageCode } = req.params;
    const translation = await db.getTranslation(languageCode);
    
    if (translation) {
      res.json({
        success: true,
        data: {
          languageCode: translation.languageCode,
          summary: translation.summary,
          description: translation.description,
          keyword1: translation.keyword1 || '',
          keyword2: translation.keyword2 || '',
          keyword3: translation.keyword3 || '',
          timestamp: translation.timestamp,
          cached: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          languageCode,
          summary: null,
          description: null,
          keyword1: null,
          keyword2: null,
          keyword3: null,
          cached: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Translate multiple languages
app.post('/api/translate/batch', async (req, res) => {
  try {
    const { languageCodes } = req.body;
    const englishData = await readEnglishListingData();
    const results = [];
    
    addLog(`🔄 Starting batch translation for ${languageCodes.length} languages: ${languageCodes.join(', ')}`, 'info');
    
    for (const languageCode of languageCodes) {
      try {
        addLog(`📝 Translating ${languageCode}...`, 'info');
        
        if (languageCode === 'en-US') {
          const englishDataWithName = {
            name: englishData.name,
            summary: englishData.summary,
            description: englishData.description,
            keyword1: englishData.keyword1 || '',
            keyword2: englishData.keyword2 || '',
            keyword3: englishData.keyword3 || ''
          };
          
          // Store English content in database
          await db.storeTranslation(languageCode, englishDataWithName.summary, englishDataWithName.description, 
            englishDataWithName.keyword1, englishDataWithName.keyword2, englishDataWithName.keyword3);
          
          results.push({
            languageCode,
            success: true,
            summary: englishDataWithName.summary,
            description: englishDataWithName.description,
            keyword1: englishDataWithName.keyword1,
            keyword2: englishDataWithName.keyword2,
            keyword3: englishDataWithName.keyword3,
            timestamp: Date.now()
          });
          
          addLog(`✅ ${languageCode}: Using original English content`, 'success');
          continue;
        }
        
        // Only translate fields that are configured to be updated
        const translationPromises = [];
        let summaryTranslation = englishData.summary; // Default to original
        let descriptionTranslation = englishData.description; // Default to original
        // Keywords are translated
        let keyword1 = englishData.keyword1 || '';
        let keyword2 = englishData.keyword2 || '';
        let keyword3 = englishData.keyword3 || '';
        
        if (shouldUpdateField('summary')) {
          translationPromises.push(
            translateText(englishData.summary, languageCode, 'summary').then(result => {
              summaryTranslation = result;
            })
          );
        }
        
        if (shouldUpdateField('description')) {
          translationPromises.push(
            translateText(englishData.description, languageCode, 'description').then(result => {
              descriptionTranslation = result;
            })
          );
        }
        
        // Translate keywords (if configured to update)
        if (shouldUpdateField('keywords')) {
          if (keyword1) {
            translationPromises.push(
              translateText(keyword1, languageCode, 'keyword').then(result => {
                keyword1 = result;
              })
            );
          }
          if (keyword2) {
            translationPromises.push(
              translateText(keyword2, languageCode, 'keyword').then(result => {
                keyword2 = result;
              })
            );
          }
          if (keyword3) {
            translationPromises.push(
              translateText(keyword3, languageCode, 'keyword').then(result => {
                keyword3 = result;
              })
            );
          }
        }
        
        // Wait for all translations to complete
        if (translationPromises.length > 0) {
          await Promise.all(translationPromises);
        }
        
        // Store translation in database (keywords translated)
        await db.storeTranslation(languageCode, summaryTranslation, descriptionTranslation, keyword1, keyword2, keyword3);
        
        results.push({
          languageCode,
          success: true,
          summary: summaryTranslation,
          description: descriptionTranslation,
          keyword1,
          keyword2,
          keyword3,
          timestamp: Date.now()
        });
        
        addLog(`✅ ${languageCode}: Translation completed and stored in database`, 'success');
      } catch (error) {
        results.push({
          languageCode,
          success: false,
          error: error.message
        });
        
        addLog(`❌ ${languageCode}: Translation failed - ${error.message}`, 'error');
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    addLog(`🎉 Batch translation completed: ${successCount} successful, ${failCount} failed`, 
           failCount > 0 ? 'warning' : 'success');
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    addLog(`❌ Batch translation error: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Translate content for a specific language
app.post('/api/translate/:languageCode', async (req, res) => {
  try {
    const { languageCode } = req.params;
    const englishData = await readEnglishListingData();
    
    addLog(`📝 Translating ${languageCode}...`, 'info');
    
    if (languageCode === 'en-US') {
      const englishDataWithName = {
        name: englishData.name,
        summary: englishData.summary,
        description: englishData.description,
        keyword1: englishData.keyword1 || '',
        keyword2: englishData.keyword2 || '',
        keyword3: englishData.keyword3 || ''
      };
      
      // Store English content in database
      await db.storeTranslation(languageCode, englishDataWithName.summary, englishDataWithName.description,
        englishDataWithName.keyword1, englishDataWithName.keyword2, englishDataWithName.keyword3);
      
      addLog(`✅ ${languageCode}: Using original English content`, 'success');
      
      res.json({
        success: true,
        data: {
          languageCode,
          summary: englishDataWithName.summary,
          description: englishDataWithName.description,
          keyword1: englishDataWithName.keyword1,
          keyword2: englishDataWithName.keyword2,
          keyword3: englishDataWithName.keyword3,
          timestamp: Date.now(),
          cached: true
        }
      });
      return;
    }
    
    // Only translate fields that are configured to be updated
    const translationPromises = [];
    let summaryTranslation = englishData.summary; // Default to original
    let descriptionTranslation = englishData.description; // Default to original
    // Keywords are translated
    let keyword1 = englishData.keyword1 || '';
    let keyword2 = englishData.keyword2 || '';
    let keyword3 = englishData.keyword3 || '';
    
    if (shouldUpdateField('summary')) {
      translationPromises.push(
        translateText(englishData.summary, languageCode, 'summary').then(result => {
          summaryTranslation = result;
        })
      );
    }
    
    if (shouldUpdateField('description')) {
      translationPromises.push(
        translateText(englishData.description, languageCode, 'description').then(result => {
          descriptionTranslation = result;
        })
      );
    }
    
    // Translate keywords (if configured to update)
    if (shouldUpdateField('keywords')) {
      if (keyword1) {
        translationPromises.push(
          translateText(keyword1, languageCode, 'keyword').then(result => {
            keyword1 = result;
          })
        );
      }
      if (keyword2) {
        translationPromises.push(
          translateText(keyword2, languageCode, 'keyword').then(result => {
            keyword2 = result;
          })
        );
      }
      if (keyword3) {
        translationPromises.push(
          translateText(keyword3, languageCode, 'keyword').then(result => {
            keyword3 = result;
          })
        );
      }
    }
    
    // Wait for all translations to complete
    if (translationPromises.length > 0) {
      await Promise.all(translationPromises);
    }
    
    // Store translation in database (keywords translated)
    await db.storeTranslation(languageCode, summaryTranslation, descriptionTranslation, keyword1, keyword2, keyword3);
    
    addLog(`✅ ${languageCode}: Translation completed and stored in database`, 'success');
    
    res.json({
      success: true,
      data: {
        languageCode,
        summary: summaryTranslation,
        description: descriptionTranslation,
        keyword1,
        keyword2,
        keyword3,
        timestamp: Date.now(),
        cached: true
      }
    });
  } catch (error) {
    addLog(`❌ ${req.params.languageCode}: Translation failed - ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache status
app.get('/api/cache/status', async (req, res) => {
  try {
    const translations = await db.getAllTranslations();
    const languages = Object.keys(translations);
    
    const cacheStats = {
      totalCached: languages.length,
      languages: languages,
      cacheEntries: Object.values(translations).map(data => ({
        languageCode: data.languageCode,
        timestamp: data.timestamp,
        summaryLength: data.summary ? data.summary.length : 0,
        descriptionLength: data.description ? data.description.length : 0
      }))
    };
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get console logs
app.get('/api/console/logs', (req, res) => {
  try {
    res.json({
      success: true,
      data: consoleLogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get field update configuration
app.get('/api/config/fields', (req, res) => {
  try {
    res.json({
      success: true,
      data: config.UPDATE_FIELDS
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update field configuration
app.post('/api/config/fields', (req, res) => {
  try {
    const { summary, description, keywords } = req.body;
    
    // Validate the input
    if (typeof summary !== 'boolean' || typeof description !== 'boolean' || typeof keywords !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Summary, description, and keywords must be boolean values'
      });
    }
    
    // Update the configuration
    config.UPDATE_FIELDS.summary = summary;
    config.UPDATE_FIELDS.description = description;
    config.UPDATE_FIELDS.keywords = keywords;
    
    addLog(`✅ Field configuration updated: Summary=${summary}, Description=${description}, Keywords=${keywords}`, 'success');
    
    res.json({
      success: true,
      message: 'Field configuration updated successfully',
      data: config.UPDATE_FIELDS
    });
  } catch (error) {
    addLog(`❌ Error updating field configuration: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
app.delete('/api/cache', async (req, res) => {
  try {
    const result = await db.clearAllTranslations();
    addLog(`🗑️  All translations cleared from database (${result.deleted} records)`, 'info');
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      deleted: result.deleted
    });
  } catch (error) {
    addLog(`❌ Error clearing cache: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute update (integrates with existing update-listing.js)
app.post('/api/execute/update', async (req, res) => {
  try {
    const { languageCodes } = req.body;
    
    // Start the update process asynchronously
    executeUpdateProcess(languageCodes).catch(error => {
      console.error('Update process error:', error);
    });
    
    res.json({
      success: true,
      message: 'Update execution started',
      data: {
        languages: languageCodes,
        status: 'processing',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Function to execute the update process
async function executeUpdateProcess(languageCodes) {
  const { spawn } = require('child_process');
  
  try {
    addLog(`🚀 Starting update process for languages: ${languageCodes.join(', ')}`, 'info');
    
    // Get translations from database for the selected languages
    const availableTranslations = {};
    const missingLanguages = [];
    
    for (const languageCode of languageCodes) {
      if (languageCode === 'en-US') {
        // English doesn't need translation - use original content
        const englishData = await readEnglishListingData();
        availableTranslations[languageCode] = {
          summary: englishData.summary,
          description: englishData.description,
          keyword1: englishData.keyword1 || '',
          keyword2: englishData.keyword2 || '',
          keyword3: englishData.keyword3 || '',
          timestamp: Date.now()
        };
        addLog(`📋 Using original English content for ${languageCode}`, 'info');
      } else {
        const translation = await db.getTranslation(languageCode);
        if (translation) {
          availableTranslations[languageCode] = {
            summary: translation.summary,
            description: translation.description,
            keyword1: translation.keyword1 || '',
            keyword2: translation.keyword2 || '',
            keyword3: translation.keyword3 || '',
            timestamp: translation.timestamp
          };
          addLog(`📋 Using database translation for ${languageCode}`, 'info');
        } else {
          missingLanguages.push(languageCode);
          addLog(`⚠️  No translation found for ${languageCode} - will be skipped`, 'warning');
        }
      }
    }
    
    // Only process languages that have translations
    const languagesToProcess = Object.keys(availableTranslations);
    
    if (languagesToProcess.length === 0) {
      addLog(`❌ No translations found for any selected languages. Please translate content first.`, 'error');
      return;
    }
    
    if (missingLanguages.length > 0) {
      addLog(`⏭️  Skipping ${missingLanguages.length} languages without translations: ${missingLanguages.join(', ')}`, 'warning');
    }
    
    // Set environment variable to specify which languages to process
    const env = { 
      ...process.env, 
      UPDATE_LANGUAGES: languagesToProcess.join(','),
      UPDATE_FIELDS: JSON.stringify(config.UPDATE_FIELDS),
      CACHED_TRANSLATIONS: JSON.stringify(availableTranslations)
    };
    
    // Spawn the update-listing.js process
    const updateProcess = spawn('node', ['update-listing.js'], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Handle process output
    updateProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addLog(`Update Process: ${message}`, 'info');
      }
    });
    
    updateProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addLog(`Update Process Error: ${message}`, 'error');
      }
    });
    
    updateProcess.on('close', (code) => {
      if (code === 0) {
        addLog(`✅ Update process completed successfully for languages: ${languageCodes.join(', ')}`, 'success');
      } else {
        addLog(`❌ Update process failed with code ${code} for languages: ${languageCodes.join(', ')}`, 'error');
      }
    });
    
    updateProcess.on('error', (error) => {
      addLog(`❌ Failed to start update process: ${error.message}`, 'error');
    });
    
  } catch (error) {
    addLog(`Error executing update process: ${error.message}`, 'error');
  }
}

// Execute validation (placeholder - would integrate with existing validation)
app.post('/api/execute/validate', async (req, res) => {
  try {
    const { languageCodes } = req.body;
    
    // This would integrate with the existing validation functionality
    res.json({
      success: true,
      message: 'Validation execution started',
      data: {
        languages: languageCodes,
        status: 'pending',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected to console log stream');
  
  // Send existing logs to newly connected client
  socket.emit('console-logs-history', consoleLogs);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from console log stream');
  });
});

// Start server
server.listen(PORT, async () => {
  try {
    // Initialize database
    await db.init();
    
    console.log(`🚀 Translation Console Server running on http://localhost:${PORT}`);
    console.log(`📋 Configuration loaded:`);
    console.log(`   - Languages: ${getFilteredLanguages().length} supported`);
    console.log(`   - Field updates: Summary=${config.UPDATE_FIELDS.summary}, Description=${config.UPDATE_FIELDS.description}, Keywords=${config.UPDATE_FIELDS.keywords}`);
    console.log(`   - Database: SQLite initialized`);
    
    // Add initial log to test the system
    addLog('🚀 Translation Console Server started with database', 'success');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  try {
    await db.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
