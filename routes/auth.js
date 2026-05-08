const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { setUser, clearUser } = require('../middleware/auth');

router.get('/login', (req, res) => {
  res.render('login', { title: '登录', error: null, redirect: req.query.redirect || '' });
});

router.post('/login', (req, res) => {
  const { username, password, redirect: postRedirect } = req.body;
  const db = getDb();

  // ===== SQL注入漏洞：直接拼接用户输入 =====
  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  try {
    const user = db.prepare(sql).get();
    if (user) {
      setUser(req, user);
      const redirect = postRedirect || '/dashboard';
      return res.redirect(redirect);
    }
    res.render('login', { title: '登录', error: '用户名或密码错误', redirect: postRedirect || '' });
  } catch (e) {
    console.error('[AUTH] 登录异常:', e.message);
    res.render('login', { title: '登录', error: '登录失败: ' + e.message, redirect: postRedirect || '' });
  }
});

router.get('/register', (req, res) => {
  res.render('register', { title: '注册', error: null });
});

router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  const db = getDb();

  // ===== SQL注入漏洞：直接拼接用户输入 =====
  const sql = `INSERT INTO users (username, password, email, role) VALUES ('${username}', '${password}', '${email}', 'user')`;

  try {
    db.prepare(sql).run();
    res.redirect('/login');
  } catch (e) {
    res.render('register', { title: '注册', error: '注册失败: ' + e.message });
  }
});

router.get('/logout', (req, res) => {
  clearUser(req);
  res.redirect('/');
});

module.exports = router;
