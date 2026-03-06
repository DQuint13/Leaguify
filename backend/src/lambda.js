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

// Single CORS header set - applied to every Lambda response (no duplicate values)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
};

function ensureCors(response) {
  if (!response) return response;
  const headers = response.headers || {};
  // Remove any existing CORS headers to avoid "multiple values" then add our single set
  const keys = Object.keys(headers);
  for (const k of keys) {
    if (k.toLowerCase().startsWith('access-control-')) delete headers[k];
  }
  response.headers = { ...headers, ...CORS_HEADERS };
  return response;
}

// Initialize database on first request
let initPromise = null;

module.exports.handler = async (event, context) => {
  const startMs = Date.now();
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  const path = event?.path ?? event?.rawPath ?? event?.resource ?? 'unknown';
  try {
    if (!dbInitialized && !initPromise) {
      initPromise = initializeDatabase();
    }
    if (initPromise) {
      await initPromise;
    }
    const response = await handler(event, context);
    const durationMs = Date.now() - startMs;
    if (durationMs > 2000 || process.env.NODE_ENV === 'development') {
      console.log('Lambda request', { method, path, durationMs, statusCode: response?.statusCode });
    }
    return ensureCors(response);
  } catch (err) {
    const method = event?.httpMethod || event?.requestContext?.http?.method;
    const path = event?.path ?? event?.rawPath ?? event?.resource ?? 'unknown';
    console.error('Lambda handler error:', {
      method,
      path,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      }),
    };
  }
};
