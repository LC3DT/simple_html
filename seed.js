const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.db');

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('[SEED] 已删除旧数据库');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email    TEXT,
    bio      TEXT,
    role     TEXT DEFAULT 'user'
  );
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    description TEXT,
    price       REAL,
    image       TEXT,
    category    TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    username   TEXT,
    content    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    email      TEXT,
    message    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertUser = db.prepare('INSERT INTO users (username, password, email, bio, role) VALUES (?, ?, ?, ?, ?)');
const insertProduct = db.prepare('INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)');
const insertComment = db.prepare('INSERT INTO comments (product_id, username, content, created_at) VALUES (?, ?, ?, ?)');
const insertContact = db.prepare('INSERT INTO contacts (name, email, message, created_at) VALUES (?, ?, ?, ?)');

const users = [
  ['admin', 'admin123', 'admin@shop.com', '系统管理员', 'admin'],
  ['test', 'test123', 'test@example.com', '测试用户', 'user'],
  ['alice', 'pass1', 'alice@shop.com', '前端工程师，热爱React和Vue', 'user'],
  ['bob', 'pass2', 'bob@shop.com', '后端开发者，擅长Node.js和Python', 'user'],
  ['mallory', 'hack', 'mallory@evil.com', '安全研究员，白帽子', 'user']
];

const products = [
  ['智能手机 Pro Max', '6.7英寸OLED屏幕，200MP主摄，5000mAh电池，支持5G网络', 6999.00, '/images/phone.png', '手机'],
  ['超薄笔记本 Air', '14英寸2K屏，i7-13700H，16GB内存，512GB SSD', 5999.00, '/images/laptop.png', '笔记本'],
  ['无线降噪耳机', '主动降噪，40小时续航，Hi-Res认证音质', 1299.00, '/images/headphone.png', '耳机'],
  ['机械键盘 RGB', 'Cherry MX轴体，全键无冲，铝合金面板，RGB背光', 699.00, '/images/keyboard.png', '外设'],
  ['4K显示器 27寸', 'IPS面板，HDR400，Type-C 65W供电，内置音箱', 2999.00, '/images/monitor.png', '显示器'],
  ['游戏鼠标 无线', 'PAW3395传感器，26000DPI，80小时续航', 399.00, '/images/mouse.png', '外设'],
  ['移动固态硬盘 1TB', 'USB 3.2 Gen2，读取速度2000MB/s，IP55防水', 799.00, '/images/ssd.png', '存储'],
  ['智能手表 Ultra', '钛合金表壳，全天候显示，100米防水，GPS', 4999.00, '/images/watch.png', '穿戴']
];

const comments = [
  [1, 'alice', '这个手机拍照效果太好了，200MP果然不一样！', '2024-01-15 10:30:00'],
  [1, 'bob', '电池续航也不错，用一天完全没问题。', '2024-01-16 14:20:00'],
  [2, 'test', '笔记本很轻薄，带出门很方便。', '2024-02-01 09:00:00'],
  [3, 'mallory', '降噪效果出乎意料的好，推荐！', '2024-02-10 16:45:00'],
  [4, 'alice', '键盘手感很好，打字敲代码都很舒服。', '2024-03-05 11:30:00'],
  [6, 'bob', '鼠标很轻，适合长时间游戏使用。', '2024-03-20 08:15:00']
];

const contacts = [
  ['张三', 'zhangsan@qq.com', '你好，我想咨询一下智能手机Pro Max的优惠政策', '2024-01-10 09:00:00'],
  ['李四', 'lisi@163.com', '请问超薄笔记本Air支持外接几个显示器？', '2024-01-12 15:30:00']
];

const transaction = db.transaction(() => {
  for (const u of users) insertUser.run(...u);
  for (const p of products) insertProduct.run(...p);
  for (const c of comments) insertComment.run(...c);
  for (const ct of contacts) insertContact.run(...ct);
});
transaction();

console.log('[SEED] 种子数据已写入');
console.log(`  - 用户: ${users.length} 条`);
console.log(`  - 商品: ${products.length} 条`);
console.log(`  - 评论: ${comments.length} 条`);
console.log(`  - 留言: ${contacts.length} 条`);

db.close();
