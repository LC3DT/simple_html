const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const q = req.query.q || '';

  let products;
  // ===== SQL注入漏洞：搜索关键词直接拼入SQL =====
  if (q) {
    const sql = `SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;
    try {
      products = db.prepare(sql).all();
    } catch (e) {
      products = [];
    }
  } else {
    products = db.prepare('SELECT * FROM products').all();
  }

  res.render('products', { title: '商品列表', products, q });
});

router.get('/:id', (req, res) => {
  const db = getDb();

  // ===== SQL注入漏洞：id直接拼入SQL =====
  const productSql = `SELECT * FROM products WHERE id = ${req.params.id}`;
  let product;
  try {
    product = db.prepare(productSql).get();
  } catch (e) {
    product = null;
  }

  if (!product) {
    return res.status(404).send('商品不存在');
  }

  // ===== SQL注入漏洞：product_id拼入查询 =====
  const commentSql = `SELECT * FROM comments WHERE product_id = ${req.params.id} ORDER BY created_at DESC`;
  let comments;
  try {
    comments = db.prepare(commentSql).all();
  } catch (e) {
    comments = [];
  }

  res.render('product-detail', { title: product.name, product, comments });
});

router.post('/:id/comment', (req, res) => {
  const { username, content } = req.body;
  const db = getDb();

  // ===== SQL注入漏洞：直接拼接评论内容 =====
  const sql = `INSERT INTO comments (product_id, username, content) VALUES (${req.params.id}, '${username}', '${content}')`;

  try {
    db.prepare(sql).run();
  } catch (e) {}

  res.redirect('/products/' + req.params.id);
});

module.exports = router;
