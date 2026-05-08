const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products LIMIT 4').all();
  res.render('index', { title: '首页', products });
});

module.exports = router;
