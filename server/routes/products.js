const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const fetchAll = limit === 'all';
    const offset = fetchAll ? 0 : (page - 1) * parseInt(limit);

    let query = 'SELECT * FROM products WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR product_id ILIKE $${paramCount})`;
      countQuery += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR product_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      countQuery += ` AND category = $${paramCount}`;
      params.push(category);
    }

    // Add ORDER BY to both cases
    query += ' ORDER BY created_at DESC';

    // Only add LIMIT and OFFSET if not fetching all products
    if (!fetchAll) {
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), offset);
    }

    const [productsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    res.json({
      products: productsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: fetchAll ? 1 : Math.ceil(countResult.rows[0].count / limit),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: fetchAll ? countResult.rows[0].count : parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, quantity, price, product_id, category, supplier } = req.body;

    if (!title || !quantity || !price || !product_id) {
      return res.status(400).json({ error: 'Title, quantity, price, and product_id are required' });
    }

    // Check if product_id already exists
    const existingProduct = await pool.query(
      'SELECT id FROM products WHERE product_id = $1',
      [product_id]
    );

    if (existingProduct.rows.length > 0) {
      return res.status(400).json({ error: 'Product ID already exists' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO products (title, description, quantity, price, image_url, product_id, category, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, parseInt(quantity), parseFloat(price), image_url, product_id, category, supplier]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, quantity, price, product_id, category, supplier } = req.body;

    // Check if product exists
    const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if new product_id conflicts with other products
    if (product_id && product_id !== existingProduct.rows[0].product_id) {
      const conflictCheck = await pool.query(
        'SELECT id FROM products WHERE product_id = $1 AND id != $2',
        [product_id, id]
      );
      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Product ID already exists' });
      }
    }

    let image_url = existingProduct.rows[0].image_url;
    if (req.file) {
      // Delete old image if exists
      if (existingProduct.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, '../..', existingProduct.rows[0].image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE products 
       SET title = $1, description = $2, quantity = $3, price = $4, image_url = $5, 
           product_id = $6, category = $7, supplier = $8
       WHERE id = $9 RETURNING *`,
      [title, description, parseInt(quantity), parseFloat(price), image_url, 
       product_id, category, supplier, id]
    );

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get product info for image deletion
    const productResult = await pool.query('SELECT image_url FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete image file if exists
    if (productResult.rows[0].image_url) {
      const imagePath = path.join(__dirname, '../..', productResult.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete product
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\' ORDER BY category');
    res.json({ categories: result.rows.map(row => row.category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 