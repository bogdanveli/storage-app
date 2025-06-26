require('dotenv').config();
const pool = require('./connection');

const createTables = async () => {
  try {
    console.log('Connected to PostgreSQL database');

    // Drop existing tables if they exist
    await pool.query('DROP TABLE IF EXISTS admin_users CASCADE');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        price_cny DECIMAL(10, 2) NOT NULL,
        product_id VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100),
        supplier VARCHAR(100),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admin_users table with all columns
    await pool.query(`
      CREATE TABLE admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP
      )
    `);

    // Create invoice items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL
      )
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // Create currency rates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS currency_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(10) NOT NULL,
        to_currency VARCHAR(10) NOT NULL,
        rate DECIMAL(10, 4) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_currency, to_currency)
      );
    `);

    // Insert default currency rates
    await pool.query(`
      INSERT INTO currency_rates (from_currency, to_currency, rate)
      VALUES 
        ('USD', 'CNY', 7.23),
        ('USD', 'MKD', 57.50),
        ('MKD', 'CNY', 0.126),
        ('CNY', 'MKD', 8.15)
      ON CONFLICT (from_currency, to_currency) DO NOTHING;
    `);

    console.log('Tables created successfully');

    // Create default admin user
    await pool.query(`
      INSERT INTO admin_users (username, email, password, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
    `, ['admin', 'admin@storage.com', 'admin123', 'Admin', 'User']);

    console.log('\nDefault admin user created:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Please change these credentials after first login!\n');

    // Create function to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for products table
    await pool.query(`
      DROP TRIGGER IF EXISTS update_products_updated_at ON products;
      CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    console.log('Database setup finished');
    process.exit();
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Database setup finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables }; 