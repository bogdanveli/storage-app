const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get total products count
      const productsResult = await client.query('SELECT COUNT(*) FROM products');
      const totalProducts = parseInt(productsResult.rows[0].count);

      // Get total invoices count
      const invoicesResult = await client.query('SELECT COUNT(*) FROM invoices');
      const totalInvoices = parseInt(invoicesResult.rows[0].count);

      // Get low stock count (products with quantity less than 10)
      const lowStockResult = await client.query(
        'SELECT COUNT(*) FROM products WHERE quantity < 10'
      );
      const lowStockCount = parseInt(lowStockResult.rows[0].count);

      res.json({
        totalProducts,
        totalInvoices,
        lowStockCount
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 