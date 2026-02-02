const serverless = require('serverless-http');
const app = require('./server');
const { initDatabase, createTables } = require('./models/database');

let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;

  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  initDatabase(dbConfig);
  await createTables();
  dbInitialized = true;
}

// Wrap handler to ensure database is initialized
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

// Initialize database on first request
let initPromise = null;

module.exports.handler = async (event, context) => {
  if (!dbInitialized && !initPromise) {
    initPromise = initializeDatabase();
  }
  if (initPromise) {
    await initPromise;
  }
  return handler(event, context);
};
