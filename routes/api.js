const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/users', (req, res) => {
  const db = getDb();
  const name = req.query.name || '';

  // ===== SQL注入漏洞：API参数直接拼入SQL =====
  const sql = `SELECT id, username, email, bio, role FROM users WHERE username LIKE '%${name}%'`;

  try {
    const users = db.prepare(sql).all();
    res.json({ success: true, data: users, sql });
  } catch (e) {
    res.json({ success: false, error: e.message, sql });
  }
});

router.get('/products', (req, res) => {
  const db = getDb();
  const category = req.query.category || '';

  // ===== SQL注入漏洞：API参数直接拼入SQL =====
  let sql;
  if (category) {
    sql = `SELECT * FROM products WHERE category = '${category}'`;
  } else {
    sql = 'SELECT * FROM products';
  }

  try {
    const products = db.prepare(sql).all();
    res.json({ success: true, data: products, sql });
  } catch (e) {
    res.json({ success: false, error: e.message, sql });
  }
});

module.exports = router;
