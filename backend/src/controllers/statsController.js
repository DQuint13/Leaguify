const { getLeagueStatistics } = require('../models/database');

async function getLeagueStatisticsHandler(req, res) {
  try {
    const { id } = req.params;
    const statistics = await getLeagueStatistics(id);
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

module.exports = {
  getLeagueStatisticsHandler,
};
