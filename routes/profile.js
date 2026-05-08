const express = require('express');
const { exec } = require('child_process');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    // ===== 路径遍历漏洞：不做任何文件名过滤 =====
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const success = req.query.upload ? '文件上传成功' : null;
  res.render('profile', { title: '个人信息', user, success, error: null });
});

router.post('/', requireAuth, (req, res) => {
  const { email, bio, avatar_url } = req.body;
  const db = getDb();

  // ===== SQL注入漏洞：直接拼接bio和email =====
  const sql = `UPDATE users SET email = '${email}', bio = '${bio}' WHERE id = ${req.session.user.id}`;

  try {
    db.prepare(sql).run();
  } catch (e) {
    console.error('[PROFILE] 资料更新失败:', e.message);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    return res.render('profile', { title: '个人信息', user, success: null, error: '保存失败，请重试' });
  }

  // ===== 命令注入漏洞：avatar_url传入shell命令 =====
  if (avatar_url && avatar_url.trim()) {
    const cmd = `curl -o uploads/avatar_${req.session.user.id}.png "${avatar_url}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log('[CMD] 头像下载失败:', err.message);
      }
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.render('profile', { title: '个人信息', user, success: '保存成功', error: null });
});

router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  // ===== 路径遍历 + 无文件类型检查 =====
  if (!req.file) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    return res.render('profile', { title: '个人信息', user, success: null, error: '请选择文件' });
  }
  res.redirect('/profile?upload=ok');
});

module.exports = router;
