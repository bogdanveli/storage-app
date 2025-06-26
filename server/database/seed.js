const pool = require('./connection');

const products = [
  {
    title: 'Professional Desk Chair',
    description: 'Ergonomic office chair with lumbar support and adjustable height',
    quantity: 15,
    price: 199.99,
    product_id: 'CHAIR-001',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'Wireless Mouse',
    description: 'High-precision wireless mouse with ergonomic design',
    quantity: 50,
    price: 29.99,
    product_id: 'MOUSE-001',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Premium Notebook',
    description: 'A4 hardcover notebook with 200 pages of premium paper',
    quantity: 100,
    price: 12.99,
    product_id: 'NOTE-001',
    category: 'Office Supplies',
    supplier: 'PaperCraft Inc'
  },
  {
    title: 'LED Desk Lamp',
    description: 'Adjustable LED desk lamp with multiple brightness levels',
    quantity: 30,
    price: 45.99,
    product_id: 'LAMP-001',
    category: 'Electronics',
    supplier: 'LightTech Pro'
  },
  {
    title: 'Filing Cabinet',
    description: '4-drawer metal filing cabinet with lock',
    quantity: 10,
    price: 159.99,
    product_id: 'CAB-001',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'Mechanical Keyboard',
    description: 'Professional mechanical keyboard with RGB backlight',
    quantity: 25,
    price: 89.99,
    product_id: 'KEY-001',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Whiteboard',
    description: '48x36 inch magnetic whiteboard with aluminum frame',
    quantity: 20,
    price: 79.99,
    product_id: 'BOARD-001',
    category: 'Office Supplies',
    supplier: 'Office Essentials'
  },
  {
    title: 'Paper Shredder',
    description: 'Cross-cut paper shredder with 8-sheet capacity',
    quantity: 15,
    price: 69.99,
    product_id: 'SHRED-001',
    category: 'Electronics',
    supplier: 'Office Essentials'
  },
  {
    title: 'Standing Desk',
    description: 'Electric height-adjustable standing desk',
    quantity: 8,
    price: 399.99,
    product_id: 'DESK-001',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'Desk Organizer',
    description: 'Multi-compartment mesh desk organizer',
    quantity: 40,
    price: 24.99,
    product_id: 'ORG-001',
    category: 'Office Supplies',
    supplier: 'Office Essentials'
  },
  {
    title: 'Wireless Keyboard',
    description: 'Slim wireless keyboard with numeric keypad',
    quantity: 35,
    price: 49.99,
    product_id: 'KEY-002',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Conference Table',
    description: '10-person conference table with power outlets',
    quantity: 5,
    price: 799.99,
    product_id: 'TABLE-001',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'Printer Paper',
    description: '5000 sheets of premium A4 printer paper',
    quantity: 50,
    price: 39.99,
    product_id: 'PAPER-001',
    category: 'Office Supplies',
    supplier: 'PaperCraft Inc'
  },
  {
    title: 'Monitor Stand',
    description: 'Adjustable dual monitor stand with cable management',
    quantity: 25,
    price: 89.99,
    product_id: 'STAND-001',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Storage Cabinet',
    description: 'Large storage cabinet with adjustable shelves',
    quantity: 12,
    price: 299.99,
    product_id: 'CAB-002',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'Desk Mat',
    description: 'Large desk mat with edge stitching',
    quantity: 45,
    price: 19.99,
    product_id: 'MAT-001',
    category: 'Office Supplies',
    supplier: 'Office Essentials'
  },
  {
    title: 'Webcam',
    description: '1080p webcam with built-in microphone',
    quantity: 30,
    price: 59.99,
    product_id: 'CAM-001',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Bookshelf',
    description: '5-shelf bookcase with metal frame',
    quantity: 15,
    price: 129.99,
    product_id: 'SHELF-001',
    category: 'Furniture',
    supplier: 'Office Comfort Pro'
  },
  {
    title: 'USB Hub',
    description: '7-port USB 3.0 hub with power adapter',
    quantity: 40,
    price: 34.99,
    product_id: 'USB-001',
    category: 'Electronics',
    supplier: 'TechGear Solutions'
  },
  {
    title: 'Document Tray',
    description: '3-tier stackable document tray',
    quantity: 35,
    price: 29.99,
    product_id: 'TRAY-001',
    category: 'Office Supplies',
    supplier: 'Office Essentials'
  }
];

async function seedProducts() {
  try {
    // Clear existing products
    await pool.query('DELETE FROM products');
    
    // Insert new products
    for (const product of products) {
      await pool.query(
        `INSERT INTO products (title, description, quantity, price, product_id, category, supplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          product.title,
          product.description,
          product.quantity,
          product.price,
          product.product_id,
          product.category,
          product.supplier
        ]
      );
    }
    
    console.log('Successfully seeded 20 products');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    pool.end();
  }
}

seedProducts(); 