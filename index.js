const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');

const index = express();
index.use(cors());
index.use(express.json());

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Health check
index.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Get all orders
index.get('/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create order
index.post('/orders', async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Verify product exists (call product service)
        const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}:3001/products/${productId}`);
        const product = productResponse.data;

        const totalPrice = product.price * quantity;

        const result = await pool.query(
            'INSERT INTO orders (product_id, quantity, total_price, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [productId, quantity, totalPrice, 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 404) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(500).json({ error: 'Error creating order' });
    }
});

// Update order status
index.patch('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

const PORT = process.env.PORT || 3002;
index.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});