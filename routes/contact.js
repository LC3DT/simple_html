const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  const success = req.query.success ? '留言成功！' : null;
  res.render('contact', { title: '留言板', contacts, success, error: null });
});

router.post('/', (req, res) => {
  const { name, email, message } = req.body;
  const db = getDb();

  // ===== SQL注入漏洞：直接拼接用户输入 =====
  const sql = `INSERT INTO contacts (name, email, message) VALUES ('${name}', '${email}', '${message}')`;

  try {
    db.prepare(sql).run();
  } catch (e) {
    console.error('[CONTACT] 留言提交失败:', e.message);
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    return res.render('contact', { title: '留言板', contacts, success: null, error: '留言失败，请重试' });
  }

  res.redirect('/contact?success=1');
});

module.exports = router;
