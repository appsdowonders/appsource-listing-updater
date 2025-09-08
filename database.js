const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'product_content.db');
  }

  // Initialize database connection and create tables
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  // Create tables if they don't exist
  async createTables() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS product_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          summary TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createTranslationsTableSQL = `
        CREATE TABLE IF NOT EXISTS translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          language_code TEXT NOT NULL,
          summary TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(language_code)
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('Error creating product_content table:', err.message);
          reject(err);
          return;
        }
        
        this.db.run(createTranslationsTableSQL, (err) => {
          if (err) {
            console.error('Error creating translations table:', err.message);
            reject(err);
            return;
          }
          console.log('Product content table ready');
          console.log('Translations table ready');
          resolve();
        });
      });
    });
  }

  // Get current product content
  async getProductContent() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT name, summary, description FROM product_content ORDER BY updated_at DESC LIMIT 1';
      
      this.db.get(sql, (err, row) => {
        if (err) {
          console.error('Error getting product content:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // No content found, return null
          resolve(null);
          return;
        }
        
        resolve({
          name: row.name,
          summary: row.summary,
          description: row.description
        });
      });
    });
  }

  // Update product content
  async updateProductContent(name, summary, description) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO product_content (name, summary, description, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [name, summary, description], function(err) {
        if (err) {
          console.error('Error updating product content:', err.message);
          reject(err);
          return;
        }
        
        console.log(`Product content updated with ID: ${this.lastID}`);
        resolve({
          id: this.lastID,
          name,
          summary,
          description,
          timestamp: Date.now()
        });
      });
    });
  }

  // Get all product content history (optional - for future use)
  async getProductContentHistory() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM product_content ORDER BY updated_at DESC';
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.error('Error getting product content history:', err.message);
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Store translation for a language
  async storeTranslation(languageCode, summary, description) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO translations (language_code, summary, description, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [languageCode, summary, description], function(err) {
        if (err) {
          console.error('Error storing translation:', err.message);
          reject(err);
          return;
        }
        
        console.log(`Translation stored for ${languageCode} with ID: ${this.lastID}`);
        resolve({
          id: this.lastID,
          languageCode,
          summary,
          description,
          timestamp: Date.now()
        });
      });
    });
  }

  // Get translation for a specific language
  async getTranslation(languageCode) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT language_code, summary, description, updated_at FROM translations WHERE language_code = ?';
      
      this.db.get(sql, [languageCode], (err, row) => {
        if (err) {
          console.error('Error getting translation:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve({
          languageCode: row.language_code,
          summary: row.summary,
          description: row.description,
          timestamp: new Date(row.updated_at).getTime()
        });
      });
    });
  }

  // Get all translations
  async getAllTranslations() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT language_code, summary, description, updated_at FROM translations ORDER BY language_code';
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.error('Error getting all translations:', err.message);
          reject(err);
          return;
        }
        
        const translations = {};
        rows.forEach(row => {
          translations[row.language_code] = {
            languageCode: row.language_code,
            summary: row.summary,
            description: row.description,
            timestamp: new Date(row.updated_at).getTime()
          };
        });
        
        resolve(translations);
      });
    });
  }

  // Delete translation for a specific language
  async deleteTranslation(languageCode) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM translations WHERE language_code = ?';
      
      this.db.run(sql, [languageCode], function(err) {
        if (err) {
          console.error('Error deleting translation:', err.message);
          reject(err);
          return;
        }
        
        console.log(`Translation deleted for ${languageCode}`);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }

  // Clear all translations
  async clearAllTranslations() {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM translations';
      
      this.db.run(sql, function(err) {
        if (err) {
          console.error('Error clearing translations:', err.message);
          reject(err);
          return;
        }
        
        console.log(`All translations cleared (${this.changes} records deleted)`);
        resolve({ deleted: this.changes });
      });
    });
  }

  // Close database connection
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            reject(err);
            return;
          }
          console.log('Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Database;
