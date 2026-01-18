const express = require('express');
const cors = require('cors');
const { initDatabase, createTables } = require('./models/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection (only for local development, not Lambda)
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'leaguify',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  const pool = initDatabase(dbConfig);

  // Initialize tables on startup
  createTables()
    .then(() => {
      console.log('Database tables initialized');
    })
    .catch((err) => {
      console.error('Error initializing database tables:', err);
    });
}

// Routes
app.use('/api/leagues', require('./routes/leagues'));
app.use('/api/games', require('./routes/games'));
app.use('/api/statistics', require('./routes/statistics'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Lambda handler for serverless deployment
exports.handler = async (event, context) => {
  // This will be used when deployed to Lambda
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };

    app(req, res, (err) => {
      if (err) {
        response.statusCode = 500;
        response.body = JSON.stringify({ error: err.message });
        resolve(response);
      }
    });
  });
};

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
