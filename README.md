# TechShop WAF 测试站点

一个模拟真实企业的科技商城站点，**故意包含多种安全漏洞**，用于部署在前方 WAF（Web应用防火墙）后进行拦截测试。

网站本身不做任何安全过滤，但**正常业务逻辑完整可用**，适合自动化测试程序进行端到端爬行和交互。

## 快速启动

### Docker 部署（推荐）

```bash
cd simple_html
docker-compose up -d
# 访问 http://<服务器IP>:3000
```

### Ubuntu 裸机部署

```bash
sudo ./deploy.sh

# 服务自动注册为 systemd，开机自启
systemctl start waf-test-site      # 启动
systemctl stop waf-test-site       # 停止
systemctl status waf-test-site     # 状态
journalctl -u waf-test-site -f     # 查看日志
```

### 本地开发

```bash
npm install
npm start           # 启动 → http://localhost:3000
# 数据库种子数据首次启动自动写入
```

## 正常业务流程

网站的业务逻辑完整，自动化测试程序可正常执行以下流程：

1. 浏览首页 → 商品列表 → 商品详情 → 发表评论
2. 注册账号 → 登录 → 进入控制台 → 编辑资料 → 上传文件 → 退出
3. 访问留言板 → 提交留言（PRG 重定向）→ 查看留言列表
4. 未登录访问需认证页面 → 302 重定向到登录 → 登录后回跳原页面
5. 商品搜索（含中文）→ 查看搜索结果
6. API 接口查询 → 获取 JSON 数据

## 预置账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin123` | admin |
| `test` | `test123` | user |
| `alice` | `pass1` | user |
| `bob` | `pass2` | user |
| `mallory` | `hack` | user |

## 漏洞注入点矩阵

### SQL 注入

| 路由 | 方法 | 注入参数 | payload 示例 |
|------|------|----------|--------------|
| `/login` | POST | `username`, `password` | `admin' OR '1'='1' --` |
| `/register` | POST | `username`, `password`, `email` | `test', 'pass', 'a@b.com') --` |
| `/products?q=` | GET | `q` | `' UNION SELECT 1,2,3,4,5,6 --` |
| `/products/:id` | GET | `:id` (URL路径) | `1 UNION SELECT ...` |
| `/products/:id/comment` | POST | `username`, `content` | `x', 'y') --` |
| `/contact` | POST | `name`, `email`, `message` | `x', 'y@a.com', 'z') --` |
| `/profile` | POST | `email`, `bio` | `x@a.com', bio='hacked' WHERE 1=1 --` |
| `/api/users?name=` | GET | `name` | `' OR '1'='1` |
| `/api/products?category=` | GET | `category` | `' UNION SELECT ... --` |

### XSS（跨站脚本）

| 路由 | 方法 | 注入点 | payload 示例 |
|------|------|--------|--------------|
| `/products/:id/comment` | POST | `content` | `<script>alert(1)</script>` |
| `/contact` | POST | `message` | `<img src=x onerror=alert(1)>` |

### 命令注入

| 路由 | 方法 | 注入点 | payload 示例 |
|------|------|--------|--------------|
| `/profile` | POST | `avatar_url` | `http://x.com; ls /` 或 `\| cat /etc/passwd` |

### 路径遍历

| 路由 | 方法 | 注入点 | payload 示例 |
|------|------|--------|--------------|
| `/profile/upload` | POST | 文件名 | `../../../etc/passwd` |

## 漏洞代码说明

### SQL 注入

所有数据库查询使用 ES6 模板字符串直接拼接用户输入，无参数化查询：

```js
// routes/auth.js - 登录接口
const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
const user = db.prepare(sql).get();
```

### XSS

评论和留言内容在 EJS 模板中使用 `<%-`（不转义）渲染：

```html
<!-- views/product-detail.ejs -->
<div class="content"><%- comment.content %></div>
```

### 命令注入

用户输入的头像 URL 直接传入 `child_process.exec()`：

```js
// routes/profile.js
const cmd = `curl -o uploads/avatar_${req.session.user.id}.png "${avatarUrl}"`;
exec(cmd, (err, stdout, stderr) => { ... });
```

### 路径遍历

文件上传时直接使用客户端提供的文件名，不做任何过滤：

```js
// routes/profile.js - multer 配置
filename: (req, file, cb) => {
  cb(null, file.originalname);  // 直接使用客户端文件名
}
```

## 页面说明

| 页面 | 路由 | 功能 | 攻击测试点 |
|------|------|------|-----------|
| 首页 | `/` | 漏洞矩阵概览、预置账号 | — |
| 登录 | `/login` | 用户登录 | SQL 注入（万能密码） |
| 注册 | `/register` | 用户注册 | SQL 注入 |
| 控制台 | `/dashboard` | 登录后页面 | — |
| 商品列表 | `/products` | 商品搜索 | SQL 注入（搜索框） |
| 商品详情 | `/products/:id` | 查看商品+评论 | SQL 注入（URL参数）、XSS（评论） |
| 留言板 | `/contact` | 公开留言 | XSS（留言内容） |
| 个人信息 | `/profile` | 编辑资料+上传 | SQL注入、命令注入、路径遍历 |
| API | `/api/*` | REST API | SQL 注入 |

## WAF 测试方法

### 1. 无 WAF 场景（基准测试）

```bash
# SQL 注入 - 正常返回1条，注入后返回全部5条
curl "http://localhost:3000/api/users?name=admin"
curl "http://localhost:3000/api/users?name='%20OR%20'1'='1"

# XSS - 提交脚本标签，刷新页面查看是否弹窗
curl -X POST http://localhost:3000/contact \
  -d "name=test&email=t@t.com&message=<script>alert(1)</script>"

# 命令注入 - 尝试执行系统命令
curl -X POST http://localhost:3000/profile \
  -d "email=a@b.com&bio=test&avatar_url=http://x.com;id"
```

### 2. 接入 WAF 后测试

将 WAF 配置为反向代理，上游指向 `http://<本机>:3000`，重复上述请求，观察 WAF 是否能正确拦截。

常用 WAF 产品配置说明：
- **OpenResty + 自定义 Lua**：proxy_pass → upstream
- **ModSecurity**：SecRuleEngine On + 反向代理
- **Cloudflare WAF**：添加 DNS 记录指向服务器
- **阿里云/腾讯云 WAF**：添加域名后配置源站

## 项目结构

```
simple_html/
├── package.json
├── server.js              # Express 入口（端口 3000）
├── db.js                  # SQLite3 连接 + 建表 + 自动种子
├── seed.js                # 独立种子脚本（npm run seed）
├── middleware/
│   └── auth.js            # 登录态校验（无安全过滤）
├── routes/
│   ├── index.js           # 首页
│   ├── auth.js            # 登录/注册
│   ├── products.js        # 商品搜索/详情/评论
│   ├── contact.js         # 留言板
│   ├── profile.js         # 个人信息/上传
│   └── api.js             # API 接口
├── views/                 # EJS 模板
│   ├── layout.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── products.ejs
│   ├── product-detail.ejs
│   ├── contact.ejs
│   ├── profile.ejs
│   └── 404.ejs
├── public/
│   └── style.css
├── uploads/
├── Dockerfile
├── docker-compose.yml
├── deploy.sh
├── .gitignore
└── README.md
```

## 注意事项

- **仅在隔离/测试环境使用**，切勿部署到公网
- 数据库密码以明文存储（测试用途）
- 所有接口无任何认证/授权限制
- 服务端无任何输入验证或安全过滤
