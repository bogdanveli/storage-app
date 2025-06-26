const axios = require('axios');
const pool = require('../database/connection');

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || 'YOUR_API_KEY'; // You'll need to get an API key
const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/CNY';

async function updateExchangeRates() {
  try {
    // Fetch latest rates from the API
    const response = await axios.get(BASE_URL);
    const rates = response.data.rates;
    
    // Get MKD rate
    const mkdRate = rates.MKD;
    
    if (mkdRate) {
      // Update the rate in our database
      await pool.query(
        'UPDATE currency_rates SET rate = $1, last_updated = CURRENT_TIMESTAMP WHERE from_currency = $2 AND to_currency = $3',
        [mkdRate, 'CNY', 'MKD']
      );
      
      console.log('Exchange rates updated successfully');
      return { CNY_MKD: mkdRate };
    }
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    throw error;
  }
}

// Function to get current rates from database
async function getCurrentRates() {
  try {
    const result = await pool.query(
      'SELECT * FROM currency_rates WHERE from_currency = $1 AND to_currency = $2',
      ['CNY', 'MKD']
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error getting current rates:', error);
    throw error;
  }
}

module.exports = {
  updateExchangeRates,
  getCurrentRates
}; 