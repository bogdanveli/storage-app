const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// Get all currency rates
router.get('/currency-rates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM currency_rates ORDER BY from_currency, to_currency');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update currency rate
router.put('/currency-rates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rate } = req.body;

  try {
    const result = await pool.query(
      'UPDATE currency_rates SET rate = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [rate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency rate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating currency rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 