const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createLeagueHandler,
  getAllLeaguesHandler,
  getLeagueHandler,
  getPlayersHandler,
  getGamesHandler,
  startNewCycleHandler,
  createMockDataHandler,
} = require('../controllers/leagueController');
const {
  updatePlayerNameHandler,
  updatePlayersHandler,
  updatePlayerAvatarHandler,
} = require('../controllers/playerController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Create a new league
router.post('/', createLeagueHandler);

// Get all leagues (must be before /:id route)
router.get('/', getAllLeaguesHandler);

// Get league by ID
router.get('/:id', getLeagueHandler);

// Get all players in a league
router.get('/:id/players', getPlayersHandler);

// Update all players in a league (bulk update)
router.put('/:id/players', updatePlayersHandler);

// Get all games in a league
router.get('/:id/games', getGamesHandler);

// Start new cycle
router.post('/:id/cycles', startNewCycleHandler);

// Create mock data for testing
router.post('/:id/mock-data', createMockDataHandler);

// Update player avatar
router.put('/:id/players/:playerId/avatar', upload.single('avatar'), updatePlayerAvatarHandler);

module.exports = router;
