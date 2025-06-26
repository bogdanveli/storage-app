const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate invoice preview
router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const { selectedProducts, customerName, customerEmail } = req.body;

    if (!selectedProducts || selectedProducts.length === 0) {
      return res.status(400).json({ error: 'No products selected' });
    }

    // Get product details for selected products
    const productIds = selectedProducts.map(p => p.id);
    const productsResult = await pool.query(
      'SELECT * FROM products WHERE id = ANY($1)',
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      return res.status(400).json({ error: 'Some products not found' });
    }

    // Calculate totals and validate quantities
    let totalAmount = 0;
    const invoiceItems = [];

    for (const selectedProduct of selectedProducts) {
      const product = productsResult.rows.find(p => p.id === selectedProduct.id);
      
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${selectedProduct.id} not found` });
      }

      if (selectedProduct.quantity > product.quantity) {
        return res.status(400).json({ 
          error: `Insufficient quantity for ${product.title}. Available: ${product.quantity}, Requested: ${selectedProduct.quantity}` 
        });
      }

      // Parse price as float to ensure it's a number
      const price = parseFloat(product.price);
      const itemTotal = price * selectedProduct.quantity;
      totalAmount += itemTotal;

      invoiceItems.push({
        product: {
          ...product,
          price: price // Replace string price with number
        },
        quantity: selectedProduct.quantity,
        price: price,
        total: itemTotal
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    res.json({
      invoice: {
        invoiceNumber,
        customerName: customerName || 'Customer',
        customerEmail: customerEmail || '',
        totalAmount,
        items: invoiceItems,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate invoice preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and download PDF invoice
router.post('/generate-pdf', authenticateToken, async (req, res) => {
  try {
    const { selectedProducts, customerName, customerEmail } = req.body;

    if (!selectedProducts || selectedProducts.length === 0) {
      return res.status(400).json({ error: 'No products selected' });
    }

    // Get product details
    const productIds = selectedProducts.map(p => p.id);
    const productsResult = await pool.query(
      'SELECT * FROM products WHERE id = ANY($1)',
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      return res.status(400).json({ error: 'Some products not found' });
    }

    // Calculate totals
    let totalAmount = 0;
    const invoiceItems = [];

    for (const selectedProduct of selectedProducts) {
      const product = productsResult.rows.find(p => p.id === selectedProduct.id);
      
      if (selectedProduct.quantity > product.quantity) {
        return res.status(400).json({ 
          error: `Insufficient quantity for ${product.title}` 
        });
      }

      // Parse price as float to ensure it's a number
      const price = parseFloat(product.price);
      const itemTotal = price * selectedProduct.quantity;
      totalAmount += itemTotal;

      invoiceItems.push({
        product: {
          ...product,
          price: price // Replace string price with number
        },
        quantity: selectedProduct.quantity,
        price: price,
        total: itemTotal
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fileName = `invoice-${invoiceNumber}.pdf`;
    const filePath = path.join(__dirname, '../../uploads', fileName);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filePath));

    // Add content to PDF
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Customer: ${customerName || 'Customer'}`);
    if (customerEmail) {
      doc.text(`Email: ${customerEmail}`);
    }
    doc.moveDown();

    // Table header
    doc.fontSize(10);
    doc.text('Product', 50, doc.y);
    doc.text('Quantity', 250, doc.y);
    doc.text('Price', 350, doc.y);
    doc.text('Total', 450, doc.y);
    doc.moveDown();

    // Table content
    invoiceItems.forEach(item => {
      doc.text(item.product.title, 50, doc.y);
      doc.text(item.quantity.toString(), 250, doc.y);
      doc.text(`$${item.price.toFixed(2)}`, 350, doc.y);
      doc.text(`$${item.total.toFixed(2)}`, 450, doc.y);
      doc.moveDown();
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: $${totalAmount.toFixed(2)}`, { align: 'right' });

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    res.json({
      message: 'PDF generated successfully',
      downloadUrl: `/uploads/${fileName}`,
      invoiceNumber,
      totalAmount
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm invoice and remove products from inventory
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { selectedProducts, customerName, customerEmail, invoiceNumber } = req.body;

    if (!selectedProducts || selectedProducts.length === 0) {
      return res.status(400).json({ error: 'No products selected' });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate total amount
      let totalAmount = 0;
      const productIds = selectedProducts.map(p => p.id);

      // Get current product quantities and validate
      const productsResult = await client.query(
        'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
        [productIds]
      );

      if (productsResult.rows.length !== productIds.length) {
        throw new Error('Some products not found');
      }

      // Validate quantities and calculate total
      for (const selectedProduct of selectedProducts) {
        const product = productsResult.rows.find(p => p.id === selectedProduct.id);
        
        if (selectedProduct.quantity > product.quantity) {
          throw new Error(`Insufficient quantity for ${product.title}`);
        }

        // Parse price as float to ensure it's a number
        const price = parseFloat(product.price);
        const itemTotal = price * selectedProduct.quantity;
        totalAmount += itemTotal;
      }

      // Create invoice record
      const invoiceResult = await client.query(
        `INSERT INTO invoices (invoice_number, customer_name, customer_email, total_amount, status)
         VALUES ($1, $2, $3, $4, 'confirmed') RETURNING id`,
        [invoiceNumber, customerName, customerEmail, totalAmount]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // Create invoice items and update product quantities
      for (const selectedProduct of selectedProducts) {
        const product = productsResult.rows.find(p => p.id === selectedProduct.id);
        
        // Parse price as float to ensure it's a number
        const price = parseFloat(product.price);

        // Insert invoice item
        await client.query(
          `INSERT INTO invoice_items (invoice_id, product_id, quantity, price, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [invoiceId, product.id, selectedProduct.quantity, price, price * selectedProduct.quantity]
        );

        // Update product quantity
        const newQuantity = product.quantity - selectedProduct.quantity;
        if (newQuantity === 0) {
          // Remove product if quantity becomes 0
          await client.query('DELETE FROM products WHERE id = $1', [product.id]);
        } else {
          // Update quantity
          await client.query(
            'UPDATE products SET quantity = $1 WHERE id = $2',
            [newQuantity, product.id]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        message: 'Invoice confirmed and products updated successfully',
        invoiceId,
        totalAmount
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Confirm invoice error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get invoice history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT i.*, 
              COUNT(ii.id) as item_count
       FROM invoices i
       LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
       GROUP BY i.id
       ORDER BY i.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM invoices');

    res.json({
      invoices: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get invoice history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [invoiceResult, itemsResult] = await Promise.all([
      pool.query('SELECT * FROM invoices WHERE id = $1', [id]),
      pool.query(
        `SELECT ii.*, p.title, p.product_id
         FROM invoice_items ii
         JOIN products p ON ii.product_id = p.id
         WHERE ii.invoice_id = $1`,
        [id]
      )
    ]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      invoice: invoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get invoice details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 