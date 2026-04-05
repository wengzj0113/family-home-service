# 好帮手家政服务平台 - 项目架构与技术文档

## 一、项目概述

**好帮手 (Hao Bang Shou)** 是一个家政服务平台，连接客户（customer）、技师（worker）和管理员（admin）三类用户，提供在线下单、抢单、服务、支付、评价的全流程服务。

项目采用 **Monorepo** 架构，包含三个独立应用：

| 应用 | 目录 | 技术栈 | 默认端口 | 说明 |
|------|------|--------|----------|------|
| **backend** | `backend/` | NestJS + TypeORM + MySQL/PostgreSQL | 3005 | RESTful API + WebSocket |
| **frontend** | `frontend/` | Vue 3 + Vue Router + Vite | 3001 | 用户端移动端应用 |
| **admin** | `admin/` | Vue 3 + Element Plus + Vite | 5173 | 后台管理面板 |

---

## 二、整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          客户端层                                │
├──────────────────────────────┬──────────────────────────────────┤
│  frontend/ (用户端 H5)       │  admin/ (后台管理)               │
│  Vue 3 + Vite (port 3001)   │  Vue 3 + Element Plus (port 5173)│
│                              │                                  │
│  - 首页/服务浏览             │  - 数据仪表盘                     │
│  - 订单创建/管理             │  - 用户管理                       │
│  - 实时聊天                  │  - 技师审核                       │
│  - 钱包/优惠券/评价          │  - 提现审核                       │
│  - 个人中心/地址管理         │  - 工单管理                       │
│  - AI客服                    │  - 平台配置                       │
└──────────────┬───────────────┴───────────────┬──────────────────┘
               │ HTTP + WebSocket              │ HTTP
               │ (axios + socket.io-client)    │ (axios)
               ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      backend/ (API 服务层)                       │
│                    NestJS (port 3005)                            │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │  Users   │ │  Orders  │ │Trans-    │          │
│  │  Module  │ │  Module  │ │  Module  │ │ actions  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌───────────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Ratings │ │Notifications │ │ Addresses│ │  Chat    │    │
│  │  Module  │ │    Module     │ │  Module  │ │  Module  │    │
│  └──────────┘ └───────────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Coupons │ │  Support │ │  Files   │ │Analytics │        │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │Membership│ │  Worker  │ │  Admin   │                      │
│  │  Module  │ │  Module  │ │  Module  │                      │
│  └──────────┘ └──────────┘ └──────────┘                      │
│                                                                  │
│  中间件: RateLimit + Request Logging + ValidationPipe           │
│  静态文件: /uploads (ServeStatic)                               │
│  健康检查: GET /health                                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ TypeORM
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据持久层                                 │
│  MySQL (默认) / PostgreSQL (云端) / SQL.js (演示模式)            │
│                                                                  │
│  核心表: users, worker_profiles, orders, transactions,          │
│  platform_configs, coupons, notifications, addresses,           │
│  chat_messages, ratings, support_tickets, withdrawal_requests,  │
│  banners, service_categories, service_packages, user_points,    │
│  points_mall_items, refunds, settlements                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、Backend 详细架构

### 3.1 入口与启动

**入口文件:** `backend/src/main.ts`

```
bootstrap()
  ├─ NestFactory.create(AppModule)       // 创建 NestJS 应用
  ├─ ValidationPipe (全局)               // DTO 自动验证
  ├─ CORS 配置                           // 多域名支持, credentials: true
  └─ app.listen(PORT)                    // 默认 3005
```

**根模块:** `backend/src/app.module.ts`

- `ConfigModule.forRoot({ isGlobal: true })` — 全局环境变量
- `TypeOrmModule.forRoot(config)` — 数据库连接（支持 MySQL / PostgreSQL / SQL.js 三种驱动）
- `ServeStaticModule` — 静态文件服务 (`/uploads` -> `backend/uploads/`)
- 注册全部 16 个业务模块
- 全局中间件: `RateLimitMiddleware` + 请求日志

### 3.2 数据库配置

支持三种数据库模式，通过 `DB_TYPE` 环境变量切换：

| DB_TYPE | 驱动 | 用途 | synchronize |
|---------|------|------|-------------|
| `mysql` (默认) | mysql2 | 本地开发 / 生产 | dev: true, prod: false |
| `postgres` | pg | 云端部署 (Render PostgreSQL) | dev: true, prod: false |
| `sqljs` | sql.js | 无数据库演示模式 | true |

### 3.3 业务模块清单 (16 个模块)

#### 3.3.1 AuthModule (`src/auth/`) — 认证模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /auth/register` | POST | 用户注册（手机号 + 密码） |
| `POST /auth/login` | POST | 用户登录（密码或验证码，演示码 `123456`） |
| `PATCH /auth/roles` | PATCH | 切换角色（customer <-> worker），重新签发 JWT |
| `POST /auth/location` | POST | 同步用户位置 |

**认证机制:**
- JWT Token (`@nestjs/jwt` + `passport-jwt`)
- `@nestjs/passport` 的 `JwtAuthGuard` 保护受保护路由
- 密码使用 `bcrypt` 哈希
- Socket.IO 连接时通过 JWT 认证

#### 3.3.2 UsersModule (`src/users/`) — 用户模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /users/me` | GET | 获取当前用户信息 |
| `PATCH /users/me` | PATCH | 更新用户信息 |
| `GET /users/:id` | GET | 获取指定用户信息 |

#### 3.3.3 OrdersModule (`src/orders/`) — 订单模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /orders` | GET | 获取我的订单列表 |
| `POST /orders` | POST | 创建订单 |
| `GET /orders/pending` | GET | 获取待抢订单（技师端） |
| `GET /orders/:id` | GET | 获取订单详情 |
| `POST /orders/:id/grab` | POST | 抢单 |
| `POST /orders/:id/cancel` | POST | 取消订单 |
| `POST /orders/:id/depart` | POST | 技师出发 |
| `POST /orders/:id/arrive` | POST | 技师到达 |
| `POST /orders/:id/start` | POST | 开始服务 |
| `POST /orders/:id/complete` | POST | 完成服务 |

**订单状态流转:**
```
pending (待抢) → grabbed (已抢/进行中) → completed (已完成) → paid (已支付)
                                ↘ cancelled (已取消)
```

**关联子资源:**
- `GET /service-categories` — 服务分类列表
- `GET /service-categories/:id/packages` — 分类下的服务套餐

#### 3.3.4 TransactionsModule (`src/transactions/`) — 交易/财务模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /transactions/pay` | POST | 支付订单 |
| `POST /transactions/withdraw` | POST | 申请提现 |
| `GET /transactions/wallet` | GET | 获取钱包余额 |
| `GET /transactions/banners` | GET | 获取首页轮播图 |
| `GET /transactions/config` | GET | 获取平台配置 |
| `POST /transactions/settle` | POST | 结算（技师端收入结算） |
| `POST /transactions/refund` | POST | 申请退款 |

**支付集成:**
- 支付宝 (`alipay-sdk`)
- 微信支付 (`wechatpay-node-v3`)
- 两种支付方式均支持异步回调通知

#### 3.3.5 ChatModule (`src/chat/`) — 实时聊天模块

| 端点 | 方式 | 说明 |
|------|------|------|
| `GET /chat/contacts` | REST | 获取聊天联系人列表 |
| `GET /chat/messages/:contactId` | REST | 获取与某人的聊天记录 |
| WebSocket (Socket.IO) | 实时 | 发送/接收消息 |

**WebSocket Gateway:**
- 连接时使用 JWT 认证
- 消息持久化到 `chat_messages` 表
- 支持房间概念（按对话分组）

#### 3.3.6 SupportModule (`src/support/`) — 客服/工单模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /support/tickets` | POST | 创建工单 |
| `GET /support/tickets` | GET | 获取我的工单列表 |
| `POST /support/tickets/:id/reply` | POST | 回复工单 |
| `POST /support/ai-chat` | POST | AI 客服对话 |

**AI 客服:**
- 调用 DeepSeek API（OpenAI 兼容接口）
- 需要 `DEEPSEEK_API_KEY` 环境变量
- AI 不可用时回退到关键词规则匹配

#### 3.3.7 RatingsModule (`src/ratings/`) — 评价模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /ratings` | POST | 创建评价 |
| `GET /ratings/order/:orderId` | GET | 检查订单是否已评价 |
| `GET /ratings/worker/:workerId` | GET | 获取技师评价列表 |

#### 3.3.8 NotificationsModule (`src/notifications/`) — 通知模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /notifications` | GET | 获取通知列表 |
| `GET /notifications/unread-count` | GET | 获取未读数量 |
| `PATCH /notifications/:id/read` | PATCH | 标记已读 |

#### 3.3.9 AddressesModule (`src/addresses/`) — 地址管理模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /addresses` | GET | 获取地址列表 |
| `POST /addresses` | POST | 新增地址 |
| `PUT /addresses/:id` | PUT | 更新地址 |
| `DELETE /addresses/:id` | DELETE | 删除地址 |
| `PATCH /addresses/:id/default` | PATCH | 设为默认地址 |

#### 3.3.10 CouponsModule (`src/coupons/`) — 优惠券模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /coupons` | GET | 可领取优惠券列表 |
| `POST /coupons/:id/claim` | POST | 领取优惠券 |
| `GET /coupons/my` | GET | 我的优惠券列表 |

#### 3.3.11 FilesModule (`src/files/`) — 文件上传模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /files/upload` | POST | 上传文件（`multipart/form-data`, field: `file`） |

- 使用 Multer 处理文件上传
- 文件存储在 `backend/uploads/` 目录
- 通过 `/uploads/*` 静态路径访问

#### 3.3.12 AnalyticsModule (`src/analytics/`) — 数据分析模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /analytics/overview` | GET | 平台概览数据 |
| `GET /analytics/orders` | GET | 订单统计 |
| `GET /analytics/users` | GET | 用户统计 |
| `GET /analytics/revenue` | GET | 收入统计 |

#### 3.3.13 MembershipModule (`src/membership/`) — 会员/积分模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /membership/points` | GET | 获取积分余额 |
| `POST /membership/points/claim` | POST | 领取积分 |
| `GET /membership/levels` | GET | 获取等级列表 |
| `GET /membership/mall` | GET | 积分商城商品列表 |
| `POST /membership/mall/:id/redeem` | POST | 兑换商品 |

#### 3.3.14 WorkerModule (`src/worker/`) — 技师专属模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /worker/dashboard` | GET | 技师工作台数据 |
| `PATCH /worker/profile` | PATCH | 更新技师资料 |
| `GET /worker/earnings` | GET | 收入统计 |
| `POST /worker/submit-audit` | POST | 提交审核资料 |

#### 3.3.15 AdminModule (`src/admin/`) — 管理员模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /admin/dashboard` | GET | 管理仪表盘数据 |
| `GET /admin/users` | GET | 用户列表 |
| `PATCH /admin/users/:id/status` | PATCH | 修改用户状态 |
| `GET /admin/workers/audit` | GET | 待审核技师列表 |
| `PATCH /admin/workers/:id/audit` | PATCH | 审核技师 |
| `GET /admin/withdrawals` | GET | 提现申请列表 |
| `PATCH /admin/withdrawals/:id/audit` | PATCH | 审核提现 |
| `GET /admin/orders` | GET | 订单列表 |
| `GET /admin/config` | GET | 平台配置 |
| `PATCH /admin/config` | PATCH | 更新配置 |

#### 3.3.16 SystemController (`src/system.controller.ts`) — 系统端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /health` | GET | 健康检查（Render 使用） |
| `GET /` | GET | 基本服务信息 |

### 3.4 中间件与安全

| 中间件/防护 | 说明 |
|-------------|------|
| `ValidationPipe` (全局) | 自动验证 DTO，基于 `class-validator` |
| `RateLimitMiddleware` | 接口限流 |
| Request Logging | 记录所有请求 `[Method] [URL]` |
| `JwtAuthGuard` | JWT 认证守卫 |
| CORS | 多域名支持，`credentials: true` |

### 3.5 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3005 | 服务端口 |
| `NODE_ENV` | development | 运行环境 |
| `DB_TYPE` | mysql | 数据库类型: mysql / postgres / sqljs |
| `DB_HOST` | localhost | 数据库主机 |
| `DB_PORT` | 3306 | 数据库端口 |
| `DB_USER` | root | 数据库用户名 |
| `DB_PASS` | password | 数据库密码 |
| `DB_NAME` | family_home_service | 数据库名 |
| `DB_SYNCHRONIZE` | true (dev) / false (prod) | 自动建表 |
| `DB_SSL` | false | PostgreSQL SSL |
| `JWT_SECRET` | — | JWT 密钥（必须设置） |
| `JWT_EXPIRES_IN` | 7d | Token 过期时间 |
| `CORS_ORIGIN` | true | 允许的跨域源 |
| `DEEPSEEK_API_KEY` | — | AI 客服 API Key |
| `ALIPAY_APP_ID` | — | 支付宝 App ID |
| `ALIPAY_PRIVATE_KEY` | — | 支付宝私钥 |
| `ALIPAY_PUBLIC_KEY` | — | 支付宝公钥 |
| `ALIPAY_NOTIFY_URL` | — | 支付宝回调地址 |
| `WECHAT_APPID` | — | 微信 App ID |
| `WECHAT_MCH_ID` | — | 微信商户号 |
| `WECHAT_SERIAL_NO` | — | 微信证书序列号 |
| `WECHAT_API_V3_KEY` | — | 微信 APIv3 密钥 |
| `WECHAT_PRIVATE_KEY` | — | 微信私钥 |
| `WECHAT_NOTIFY_URL` | — | 微信回调地址 |

---

## 四、Frontend 详细架构 (用户端)

### 4.1 整体结构

```
frontend/
├── main.js                    # SSR 兼容入口 (uni-app 风格)
├── App.vue                    # 根组件 — iPhone X 手机壳模拟 + 底部 TabBar
└── src/
    ├── main.js                # SPA 入口 (Vite)
    ├── App.vue                # 实际根组件
    ├── api/
    │   └── index.js           # Axios 封装（JWT 拦截器 + 错误处理）
    ├── router/
    │   └── index.js           # Vue Router (hash history)
    ├── views/                 # 页面组件 (23 个)
    └── utils/                 # 工具函数
```

### 4.2 App.vue — 手机壳框架

- **顶部状态栏**: 模拟手机状态栏
- **iPhone X 刘海**: CSS 模拟刘海屏
- **底部 TabBar**: 4 个 Tab — 首页 / 订单 / 消息 / 我的
- Tab 与路由联动，自动高亮
- 移动端触摸事件优化，避免 TabBar 区域事件冒泡

### 4.3 路由与页面

| 路由 | 页面 | 需要登录 | 说明 |
|------|------|----------|------|
| `/` | Home | 否 | 首页（服务分类、轮播图、推荐技师、快捷入口） |
| `/login` | Login | 否 | 登录页 |
| `/register` | Register | 否 | 注册页 |
| `/order/create` | OrderCreate | 是 | 创建订单（选择服务类型、时间、地址、备注） |
| `/orders` | Orders | 是 | 订单列表（按状态筛选） |
| `/messages` | Messages | 是 | 消息列表 |
| `/chat/:contactId` | Chat | 是 | 聊天界面（WebSocket 实时通信） |
| `/map-picker` | MapPicker | 是 | 地图选点 |
| `/coupons` | CouponList | 是 | 优惠券列表 |
| `/my-coupons` | MyCoupons | 是 | 我的优惠券 |
| `/store` | Store | 是 | 积分商城 |
| `/profile` | Profile | 否 | 个人中心（用户信息、钱包、地址、设置入口） |
| `/settings` | Settings | 是 | 设置页 |
| `/role-manage` | RoleManage | 是 | 角色切换 |
| `/wallet` | Wallet | 是 | 钱包页 |
| `/withdraw` | Withdraw | 是 | 提现页 |
| `/address/list` | AddressList | 是 | 地址列表 |
| `/address/edit` | AddressEdit | 是 | 地址编辑 |
| `/address/edit/:id` | AddressEdit | 是 | 地址编辑（已有） |
| `/rating/create/:id` | RatingCreate | 是 | 创建评价 |
| `/worker/verify` | WorkerVerify | 是 | 技师认证/审核资料提交 |
| `/worker/:id` | WorkerDetail | 是 | 技师详情 |

### 4.4 API 客户端 (`src/api/index.js`)

- 基于 `axios` 创建实例
- `baseURL` 默认 `http://127.0.0.1:3005`，可通过 `VITE_API_BASE_URL` 环境变量覆盖
- **请求拦截器**: 自动添加 `Authorization: Bearer <token>` 头
- **响应拦截器**: 统一错误处理，401 自动跳转登录页

### 4.5 核心页面说明

#### Home.vue (首页)
- 服务分类网格导航
- 轮播图（来自后端 `banners`）
- 快捷入口（下单、优惠券、钱包等）
- 推荐技师列表
- 待抢订单（技师角色可见）

#### OrderCreate.vue (创建订单)
- 服务类型选择
- 服务时间选择
- 地址选择（关联 MapPicker）
- 联系人信息
- 优惠券选择与应用
- 金额计算展示

#### Orders.vue (订单管理)
- 订单状态筛选（全部/待接单/进行中/已完成）
- 订单卡片展示
- 操作按钮（取消、支付、评价等根据状态动态显示）

#### Chat.vue (聊天)
- Socket.IO 客户端实时通信
- 消息气泡（区分发送/接收）
- 消息历史记录加载
- 底部输入框

#### Profile.vue (个人中心)
- 用户头像/昵称
- 角色切换入口
- 钱包余额
- 功能入口（地址管理、优惠券、设置等）
- 退出登录

---

## 五、Admin 详细架构 (后台管理)

### 5.1 整体结构

```
admin/
├── main.js                    # SPA 入口
├── App.vue                    # 根组件（管理面板布局）
└── src/
    ├── main.js                # Vue 3 初始化 + Element Plus
    ├── api.js                 # Axios 封装
    ├── router/
    │   └── index.js           # Vue Router (hash history)
    └── views/                 # 管理页面 (7 个)
```

### 5.2 路由与页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/dashboard` | Dashboard | 数据仪表盘（用户数、订单数、收入统计等） |
| `/users` | UserList | 用户列表管理（查看/禁用） |
| `/workers` | WorkerAudit | 技师审核（查看资料、通过/拒绝） |
| `/withdrawals` | WithdrawAudit | 提现审核（列表、通过/拒绝） |
| `/orders` | OrderList | 订单列表管理 |
| `/tickets` | TicketList | 客服工单列表 |
| `/config` | Config | 平台配置（佣金率等） |

### 5.3 API 客户端 (`api.js`)

- 与前端相同的 Axios 封装模式
- `baseURL` 默认 `http://127.0.0.1:3005`，可通过 `VITE_API_BASE_URL` 或 `VITE_ADMIN_API_BASE_URL` 覆盖
- JWT 请求拦截器
- Element Plus 消息提示集成

---

## 六、数据库设计

### 6.1 数据库支持

| 数据库 | 场景 | 配置方式 |
|--------|------|----------|
| MySQL | 本地开发、生产 | `DB_TYPE=mysql` (默认) |
| PostgreSQL | 云端部署 (Render) | `DB_TYPE=postgres` |
| SQL.js | 无服务器演示 | `DB_TYPE=sqljs` |

### 6.2 核心数据表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 统一用户表 | id, phone, password, role, nickname, avatar, status |
| `worker_profiles` | 技师资料表 | user_id, real_name, id_card_no, id_card_front/back, skills, rating, audit_status |
| `orders` | 订单表 | order_no, customer_id, worker_id, service_type, status, amount |
| `transactions` | 交易记录 | order_id, user_id, type (payment/income/commission/withdrawal), amount |
| `platform_configs` | 平台配置 | config_key, config_value |
| `coupons` | 优惠券定义 | name, discount, min_amount, expire_at |
| `user_coupons` | 用户优惠券 | user_id, coupon_id, status, used_at |
| `notifications` | 通知 | user_id, title, content, is_read |
| `addresses` | 地址簿 | user_id, name, phone, province, city, address, is_default, lat, lng |
| `chat_messages` | 聊天消息 | sender_id, receiver_id, content, created_at |
| `ratings` | 评价 | order_id, worker_id, customer_id, score, content |
| `support_tickets` | 客服工单 | user_id, title, content, status |
| `withdrawal_requests` | 提现申请 | user_id, amount, status |
| `banners` | 轮播图 | image_url, link_url, sort_order |
| `service_categories` | 服务分类 | name, icon, description |
| `service_packages` | 服务套餐 | category_id, name, price, description |
| `user_points` | 用户积分 | user_id, points |
| `points_mall_items` | 积分商品 | name, points_cost, stock |
| `refunds` | 退款记录 | order_id, user_id, amount, reason, status |
| `settlements` | 结算记录 | worker_id, amount, period |

### 6.3 用户角色模型

采用统一 `users` 表，通过 `role` 字段区分：

```
role ENUM('customer', 'worker', 'admin')
```

- 用户可以同时拥有 customer 和 worker 角色
- 通过 `PATCH /auth/roles` 切换当前角色
- JWT 中携带当前角色信息

### 6.4 订单状态机

```
0: pending (待抢单)
  ↓ 技师抢单
1: grabbed (已接单/进行中)
  ↓ 技师操作: depart → arrive → start → complete
2: completed (服务完成)
  ↓ 客户支付
4: paid (已支付)

↘ 任何阶段可取消: 3: cancelled
```

---

## 七、部署架构

### 7.1 部署流程图

```
GitHub Push (main)
    │
    ├──→ GitHub Actions ──→ GitHub Pages
    │      (deploy-pages.yml)   ├── frontend/ (用户端)
    │                           └── admin/ (管理端)
    │
    └──→ Render.com (render.yaml)
            └── backend/ (API 服务)
                ├── 自动构建
                └── 健康检查 /
```

### 7.2 前端部署 (GitHub Pages)

- **CI/CD**: `.github/workflows/deploy-pages.yml`
- **触发**: 推送到 `main` 分支
- **构建**: Vite build → 静态文件
- **部署路径**:
  - 用户端: `https://<user>.github.io/<repo>/`
  - 管理端: `https://<user>.github.io/<repo>/admin/`
- **环境变量** (GitHub Variables):
  - `VITE_API_BASE_URL`: 后端 URL
  - `VITE_ADMIN_API_BASE_URL`: 管理端后端 URL（可选）

### 7.3 后端部署 (Render.com)

- **基础设施定义**: `render.yaml`
- **构建命令**: `npm ci --legacy-peer-deps && npm run build`
- **启动命令**: `npm run start:prod`
- **健康检查**: `GET /`
- **环境变量**: 见 render.yaml（23 个变量）

### 7.4 本地开发

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev

# Admin
cd admin && npm install && npm run dev
```

---

## 八、关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 后端框架 | NestJS | TypeScript 原生、模块化架构、适合企业级应用 |
| ORM | TypeORM | 与 NestJS 深度集成、支持多数据库 |
| 前端框架 | Vue 3 | 轻量、响应式系统优秀、生态成熟 |
| 管理 UI | Element Plus | Vue 3 生态最完善的桌面组件库 |
| 实时通信 | Socket.IO | 自动重连、房间机制、与 NestJS WebSocket 集成好 |
| 认证 | JWT + Passport | 无状态认证、适合前后端分离架构 |
| 构建工具 | Vite | 开发服务器启动快、HMR 优秀 |
| 部署 | GitHub Pages + Render | 免费方案、CI/CD 自动化 |
| 数据库多驱动 | MySQL / PostgreSQL / SQL.js | 开发灵活、云端兼容 |

---

## 九、核心业务流程

### 9.1 完整订单生命周期

```
1. 客户登录 → 选择服务 → 填写订单信息（时间、地址、联系方式）→ 提交订单
2. 订单进入待抢池 → 技师浏览待抢订单 → 抢单
3. 技师接单 → 出发 → 到达 → 开始服务 → 完成服务
4. 客户收到通知 → 支付订单 → 对服务评价
5. 技师获得收入（扣除平台佣金后进入钱包）
6. 技师可申请提现 → 管理员审核 → 完成提现
```

### 9.2 技师认证流程

```
1. 技师提交资料（真实姓名、身份证号、身份证正反面照片）
2. 管理员后台审核 → 通过/拒绝
3. 审核通过后技师可接订单
```

### 9.3 提现流程

```
1. 技师查看钱包余额 → 输入提现金额 → 提交提现申请
2. 管理员后台查看提现申请 → 审核通过/拒绝
3. 审核通过后更新用户余额和交易记录
```

---

## 十、文件目录速查

```
01family/
├── .github/workflows/deploy-pages.yml    # CI/CD 工作流
├── DEPLOY.md                             # 部署指南
├── render.yaml                           # Render 基础设施定义
├── db/
│   └── schema.sql                        # MySQL 数据库建表语句
├── skills/family_home_service/
│   └── SKILL.md                          # AI Agent 技能文档
│
├── backend/                              # NestJS API 服务
│   ├── src/
│   │   ├── main.ts                       # 入口
│   │   ├── app.module.ts                 # 根模块
│   │   ├── system.controller.ts          # 健康检查
│   │   ├── auth/                         # 认证模块
│   │   ├── users/                        # 用户模块
│   │   ├── orders/                       # 订单模块
│   │   ├── transactions/                 # 交易/财务模块
│   │   ├── ratings/                      # 评价模块
│   │   ├── notifications/                # 通知模块
│   │   ├── addresses/                    # 地址模块
│   │   ├── chat/                         # 聊天模块 (WebSocket)
│   │   ├── coupons/                      # 优惠券模块
│   │   ├── support/                      # 客服/工单模块
│   │   ├── files/                        # 文件上传模块
│   │   ├── analytics/                    # 数据分析模块
│   │   ├── membership/                   # 会员/积分模块
│   │   ├── worker/                       # 技师模块
│   │   ├── admin/                        # 管理员模块
│   │   └── common/                       # 公共组件（中间件等）
│   └── uploads/                          # 上传文件目录
│
├── frontend/                             # 用户端 H5 应用
│   ├── main.js                           # SSR 兼容入口
│   ├── App.vue                           # 手机壳根组件
│   └── src/
│       ├── main.js                       # SPA 入口
│       ├── api/index.js                  # API 客户端
│       ├── router/index.js               # 路由配置
│       ├── views/                        # 页面组件 (23 个)
│       └── utils/                        # 工具函数
│
└── admin/                                # 后台管理面板
    ├── main.js                           # 入口
    ├── App.vue                           # 根组件
    └── src/
        ├── main.js                       # SPA 入口
        ├── api.js                        # API 客户端
        ├── router/index.js               # 路由配置
        └── views/                        # 管理页面 (7 个)
```

---

## 十一、API 接口汇总

### 认证 (`/auth`)
- `POST /auth/register` — 注册
- `POST /auth/login` — 登录
- `PATCH /auth/roles` — 切换角色
- `POST /auth/location` — 同步位置

### 用户 (`/users`)
- `GET /users/me` — 当前用户信息
- `PATCH /users/me` — 更新用户信息
- `GET /users/:id` — 用户详情

### 订单 (`/orders`)
- `GET /orders` — 我的订单
- `POST /orders` — 创建订单
- `GET /orders/pending` — 待抢订单
- `GET /orders/:id` — 订单详情
- `POST /orders/:id/grab` — 抢单
- `POST /orders/:id/cancel` — 取消订单
- `POST /orders/:id/depart/arrive/start/complete` — 服务进度

### 交易 (`/transactions`)
- `POST /transactions/pay` — 支付
- `POST /transactions/withdraw` — 提现
- `GET /transactions/wallet` — 钱包
- `GET /transactions/banners` — 轮播图
- `POST /transactions/settle` — 结算
- `POST /transactions/refund` — 退款

### 聊天 (`/chat`)
- `GET /chat/contacts` — 联系人列表
- `GET /chat/messages/:contactId` — 聊天记录
- `WebSocket` — 实时消息

### 客服 (`/support`)
- `POST /support/tickets` — 创建工单
- `GET /support/tickets` — 我的工单
- `POST /support/tickets/:id/reply` — 回复工单
- `POST /support/ai-chat` — AI 客服

### 评价 (`/ratings`)
- `POST /ratings` — 创建评价
- `GET /ratings/order/:orderId` — 检查是否已评价
- `GET /ratings/worker/:workerId` — 技师评价列表

### 通知 (`/notifications`)
- `GET /notifications` — 通知列表
- `GET /notifications/unread-count` — 未读数量
- `PATCH /notifications/:id/read` — 标记已读

### 地址 (`/addresses`)
- CRUD 全部支持

### 优惠券 (`/coupons`)
- `GET /coupons` — 可领取列表
- `POST /coupons/:id/claim` — 领取
- `GET /coupons/my` — 我的优惠券

### 文件 (`/files`)
- `POST /files/upload` — 上传文件

### 数据分析 (`/analytics`)
- `GET /analytics/overview` — 概览
- `GET /analytics/orders/users/revenue` — 分类统计

### 会员 (`/membership`)
- `GET /membership/points` — 积分
- `GET /membership/levels` — 等级
- `GET /membership/mall` — 积分商城
- `POST /membership/mall/:id/redeem` — 兑换

### 技师 (`/worker`)
- `GET /worker/dashboard` — 工作台
- `PATCH /worker/profile` — 更新资料
- `GET /worker/earnings` — 收入
- `POST /worker/submit-audit` — 提交审核

### 管理员 (`/admin`)
- `GET /admin/dashboard` — 仪表盘
- `GET /admin/users` — 用户列表
- `GET /admin/workers/audit` — 技师审核
- `GET /admin/withdrawals` — 提现审核
- `GET /admin/orders` — 订单管理
- `GET/PATCH /admin/config` — 平台配置

### 系统
- `GET /health` — 健康检查
- `GET /` — 基本信息
- `GET /uploads/*` — 静态文件

---

## 十二、项目亮点

1. **多数据库兼容**: 同一代码支持 MySQL / PostgreSQL / SQL.js，适配不同部署场景
2. **完整的订单状态机**: 从下单到支付的全流程管理
3. **实时通信**: Socket.IO 实现客户与技师的即时聊天
4. **AI 客服集成**: DeepSeek LLM + 规则回退的智能客服
5. **双支付渠道**: 支付宝 + 微信支付
6. **角色切换**: 用户可同时是客户和技师
7. **手机壳 UI**: 前端使用 iPhone 框架模拟移动端体验
8. **CI/CD 自动化**: GitHub Actions + Render 自动部署
9. **三层架构清晰**: 前台用户端 + 后台管理 + API 服务完全分离
10. **模块化后端**: 16 个独立业务模块，职责分明
