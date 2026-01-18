const serverless = require('serverless-http');
const app = require('./server');
const { initDatabase, createTables } = require('./models/database');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;

  const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const stage = process.env.NODE_ENV || 'dev';

  try {
    const params = await ssm.send(
      new GetParametersCommand({
        Names: [
          `/${stage}/leaguify/db/host`,
          `/${stage}/leaguify/db/port`,
          `/${stage}/leaguify/db/name`,
          `/${stage}/leaguify/db/username`,
          `/${stage}/leaguify/db/password`,
        ],
        WithDecryption: true,
      })
    );

    const config = {};
    params.Parameters.forEach((param) => {
      const key = param.Name.split('/').pop();
      config[key] = param.Value;
    });

    const dbConfig = {
      host: config.host,
      port: parseInt(config.port) || 5432,
      database: config.name,
      user: config.username,
      password: config.password,
      ssl: { rejectUnauthorized: false },
    };

    initDatabase(dbConfig);
    await createTables();
    dbInitialized = true;
  } catch (error) {
    console.error('Error initializing database from SSM:', error);
    // Fallback to environment variables if SSM fails
    const dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
    initDatabase(dbConfig);
    await createTables();
    dbInitialized = true;
  }
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
