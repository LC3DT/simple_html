const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 确保目录存在 =====
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ===== 中间件（无任何安全过滤） =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'not-secure-session-secret-for-waf-testing',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true }
}));

// ===== EJS 配置 =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== 注入 session 用户到模板 =====
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ===== 路由挂载 =====
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/contact', require('./routes/contact'));
app.use('/profile', require('./routes/profile'));
app.use('/api', require('./routes/api'));

// 首页 dashboard
app.get('/dashboard', require('./middleware/auth').requireAuth, (req, res) => {
  res.render('dashboard', { title: '控制台' });
});

// ===== 启动 =====
app.listen(PORT, () => {
  console.log(`[SERVER] TechShop 运行在 http://localhost:${PORT}`);
  console.log('[SERVER] 注意：此站点故意包含安全漏洞，仅用于 WAF 测试');
});
