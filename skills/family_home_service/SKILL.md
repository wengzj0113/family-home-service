---
name: family_home_service
description: >
  针对“好帮手”家政服务平台（family_home_service）的一体化开发 Skill。
  当前端/后台/数据库相关需求与此家政项目强关联时使用本 Skill：包括但不限于用户/师傅/管理员三角色业务、服务分类与订单发布与抢单、地址与定位、钱包与提现与佣金、优惠券与评价、聊天与客服工单、文件上传与静态资源、整体架构与扩展设计。
---

# family_home_service Skill

本 Skill 用于在维护和扩展 “好帮手” 家政服务 App 时，为另一个 AI 代理提供项目专用的业务和技术上下文，包括架构概览、核心业务流程、关键模型与接口，以及常见开发任务指引。

---

## 一、项目与架构概览

### 1.1 整体组成

- **前端 `frontend/`（用户端 Web/H5）**
  - 技术栈：Vue 3 + Vue Router。
  - 主要页面：
    - `Home.vue`：首页，角色切换（客户/服务人员）、服务分类、轮播 Banner、师傅端待抢订单。
    - `OrderCreate.vue`：发布需求/创建订单。
    - `Orders.vue`：订单列表与详情。
    - `Profile.vue`：个人中心。
    - `Wallet.vue` / `Withdraw.vue`：钱包与提现。
    - `Messages.vue` / `Chat.vue`：站内消息与聊天。
    - `AddressList.vue` / `AddressEdit.vue`：地址管理。
    - `WorkerVerify.vue` / `WorkerDetail.vue`：师傅认证与详情。
    - `CouponList.vue` / `MyCoupons.vue`：优惠券。
    - `Settings.vue` / `RoleManage.vue` / `Store.vue` 等。

- **后端 `backend/`（NestJS + TypeORM + MySQL）**
  - 通过 `AppModule` 汇总各业务模块：
    - `AuthModule`：登录注册、JWT 鉴权、位置同步。
    - `UsersModule`：用户与师傅信息。
    - `OrdersModule`：订单、服务分类、服务套餐。
    - `TransactionsModule`：交易流水、佣金、提现、Banner、平台配置。
    - `RatingsModule`：评价系统。
    - `NotificationsModule`：消息与通知。
    - `AddressesModule`：地址簿。
    - `ChatModule`：聊天。
    - `CouponsModule`：优惠券。
    - `SupportModule`：工单/客服。
    - `FilesModule`：文件上传与静态资源。
  - `TypeOrmModule.forRoot` 指向数据库 `family_home_service`，开启 `autoLoadEntities` 和 `synchronize`（开发环境）。

- **管理后台 `admin/`**
  - Vue 管理端，用于服务分类配置、订单/师傅审核、财务管理等。

- **数据库脚本 `db/schema.sql`**
  - 示例包含：`users`、`worker_profiles`、`orders`、`transactions`、`platform_configs` 等表。

---

## 二、核心业务域与数据模型

### 2.1 用户与角色

- **角色定义**
  - `customer`：下单客户。
  - `worker`：服务人员/师傅。
  - `admin`：平台管理员。

- **用户表 `users` / 实体 `User`**
  - 关键字段：`phone`、`password`、`role`、`nickname`、`avatar`、`status`、`created_at`、`updated_at`。

- **师傅扩展表 `worker_profiles`**
  - 关键字段：
    - `user_id`：关联 `users.id`。
    - `real_name`、`id_card_no`、身份证照片（`id_card_front` / `id_card_back`）。
    - `skills`：技能标签。
    - `rating`：评分。
    - `credit_score`：信用分。
    - `service_count`：服务次数。
    - `audit_status`：审核状态（0 待审 / 1 通过 / 2 拒绝）。

> 当改动角色逻辑、师傅审核流程时，优先检查 `UsersModule`、`worker_profiles` 相关实体与 Service，再同步前端 `WorkerVerify.vue`、`RoleManage.vue` 等。

### 2.2 服务分类与套餐

- **服务分类 `ServiceCategory`（表 `service_categories`）**
  - 核心字段：
    - `name`：服务名称，如“日常保洁”、“家电清洗”、“搬家服务”、“保姆月嫂”等。
    - `icon`：RemixIcon 图标 class。
    - `basePrice`：基础价/单价。
    - `unit`：计费单位（小时/台/平米等）。
    - `description`：服务说明。
    - `checklist`：服务包含项目清单。
    - `exclusions`：不包含项目。
    - `isActive`：是否启用。
    - `sortOrder`：排序。
- **服务套餐 `ServicePackage`（表 `service_packages`）**
  - 如“日常保洁4次卡”、“10次卡”等次卡。
  - 字段：`name`、`categoryId`、`times`、`price`、`expireDays`、`description`、`isActive`。

- **前端使用方式**
  - `Home.vue`/`OrderCreate.vue` 调用 `GET /service-categories` 加载：
    - 首页“服务分类”宫格。
    - 发布需求时的服务类型选项、价格默认值、服务规范与不包含内容展示。
  - 初始化逻辑在 `ServiceCategoriesService.onModuleInit` 中可进行默认分类与套餐的创建。

> 添加或调整服务类别/套餐时，需同时修改：
> - 后端：`ServiceCategory`/`ServicePackage` 实体 + 初始化逻辑。
> - 前端：`Home.vue`、`OrderCreate.vue` 对 `unit`、`basePrice`、`checklist`、`exclusions` 的展示与交互。

### 2.3 订单与业务流程

- **订单实体 `Order`（表 `orders`）**
  - 关联：
    - `customerId` / `customer`（用户）。
    - `workerId` / `worker`（师傅）。
  - 主要字段：
    - `orderNo`
    - `serviceType`：与前端 `form.type` 对应。
    - `serviceTime`：预约时间。
    - `location`：城市/小区。
    - `addressDetail`
    - `lat`、`lng`
    - `contactPhone`
    - `amount`：订单金额。
    - 优惠券字段：`userCouponId`、`couponAmount`。
    - 服务配置：`estimatedDuration`、`needsTools`（是否师傅自带工具）。
    - 其他：`completedItems`、`recommendWorkerId`、`hasInsurance`、`remark`。
    - `status`：`OrderStatus`（枚举）。

- **订单状态 `OrderStatus`**
  - `PENDING = 0`：待抢单。
  - `GRABBED = 1`：已接单/待出发。
  - `COMPLETED = 2`：已完成/待支付。
  - `CANCELLED = 3`：已取消。
  - `PAID = 4`：已支付。
  - `DEPARTED = 5`：师傅已出发。
  - `ARRIVED = 6`：师傅已到达。
  - `STARTED = 7`：服务中。

- **前端发布订单流程（`OrderCreate.vue`）**
  - 拉取服务分类：`GET /service-categories`。
  - 自动填充：默认选中某一类别，设置 `form.categoryId`、`form.type`、`form.price = basePrice`。
  - 选择：
    - `serviceTime`（`datetime-local`）。
    - `estimatedDuration`（如 2/3/4/6 小时）。
    - `needsTools`（师傅自带工具 +20 元）。
    - 地址（`AddressList.vue` + `AddressEdit.vue`，支持默认地址与地图选点）。
    - 优惠券（`GET /coupons/applicable?amount=price` 获取可用券数量，`/my-coupons?mode=select` 选择具体券）。
  - 计算实付金额：`price + (needsTools ? 20 : 0) - couponAmount`。
  - 构造 `orderData` 调用 `POST /orders`。

- **师傅端订单流程**
  - 师傅端首页（`Home.vue`）根据定位（`getCurrentLocation` + `api.patch('/auth/location')`）获取待抢订单：`GET /orders/pending`。
  - 支持：
    - 抢单。
    - 出发、到达、开始服务、完成服务。
    - 完成后客户可评价（`RatingsModule`）。

> 修改订单流程时，务必保持前后端字段一致，并考虑状态机闭环（下单 → 抢单 → 出发/到达/服务中 → 完成 → 支付/评价 或 取消）。

### 2.4 钱包、交易与提现

- **交易表 `transactions`**
  - 字段：
    - `order_id`（可空）
    - `user_id`
    - `type`: `payment` / `income` / `commission` / `withdrawal`
    - `amount`
    - `balance_after`
    - `status`
- **平台配置 `platform_configs`**
  - 典型键值：
    - `commission_rate`：平台佣金比例（如 0.08）。
- **提现与 Banner**
  - `Withdrawal`、`Banner` 实体。
  - 控制器：
    - `ConfigController`：Banner & 配置。
    - `TransactionsController`：交易流水。
    - `WithdrawalsController`：提现管理。
  - 前端页面：
    - `Wallet.vue`：展示余额与流水。
    - `Withdraw.vue`：发起提现。
    - `Home.vue`：通过 `GET /config/banners/active` 拉取首页 Banner。

> 调整佣金或提现策略时，优先在 `TransactionsService` 与 `platform_configs` 中实现，再更新前端文案与展示规则。

### 2.5 其他关键域

- **地址簿 `AddressesModule`**
  - 接口：`GET /addresses` 等，支持 `isDefault`。
  - 前端：
    - `AddressList.vue` / `AddressEdit.vue`。
    - `OrderCreate.vue` 在挂载时优先加载默认地址。

- **优惠券 `CouponsModule`**
  - 接口示例：
    - `GET /coupons/applicable?amount=xxx`：当前金额下可用券列表。
    - `GET /my-coupons`：我的优惠券。
  - 前端：
    - `CouponList.vue` / `MyCoupons.vue`。

- **评价 `RatingsModule`**
  - 完成订单后客户对师傅评分与评价，影响 `worker_profiles.rating` 与 `service_count`。

- **聊天与通知**
  - `ChatModule`：会话与消息。
  - `NotificationsModule`：站内通知与可能的推送。
  - 前端：
    - `Messages.vue` / `Chat.vue`，搭配轮询或 WebSocket（具体实现看项目代码）。

- **工单与客服 `SupportModule`**
  - 接口：
    - `POST /support/tickets`：创建工单。
    - `GET /support/my-tickets`：查看我的工单。
    - `GET /support/admin/all`、`PATCH /support/admin/tickets/:id`：管理员查看/处理工单（需要 admin 角色）。

- **文件上传 `FilesModule`**
  - 结合 `ServeStaticModule`：
    - 静态路径 `rootPath: uploads`、`serveRoot: /uploads`。
    - 用于存储头像、证件照等。

---

### 2.6 鉴权、登录与角色切换

- **认证入口 `AuthModule` / `AuthController`**
  - `POST /auth/register`：注册，支持单/多角色（`roles` 或 `role` 字段，默认 `customer`）。
  - `POST /auth/login`：
    - 密码登录：`type` 为空或 `password`，走 `AuthService.validateUser`。
    - 短信验证码登录：`type = 'sms'`，演示环境验证码固定 `123456`。
  - `POST /auth/send-code`：演示环境发送固定验证码。
  - `POST /auth/worker/verify`：师傅提交实名认证与资质信息（证件照等），写入 `worker_profiles`。
  - `POST /auth/worker/approve-mock`：演示环境模拟审核通过。
  - `GET /auth/profile`：获取当前用户完整资料，用于 `Profile.vue`。
  - `GET /auth/users`、`PATCH /auth/users/:id/status`、`POST /auth/worker/:id/audit`：管理员查看用户列表、禁用用户、审运营师傅。
  - `PATCH /auth/roles`：当前用户切换/更新角色（重新签发 JWT，前端需刷新 token 与角色）。
  - `PATCH /auth/location`：更新用户当前经纬度（用于师傅端附近订单匹配）。
- **JWT 与权限**
  - 所有需要登录的接口使用 `JwtAuthGuard`。
  - 管理员接口需检查 `req.user.roles.includes('admin')`。

### 2.7 地理位置与地图

- **前端工具 `src/utils/location.js`**
  - `getCurrentLocation()`：
    - 使用 `navigator.geolocation` 获取当前位置，配置 `enableHighAccuracy`、`timeout`、`maximumAge`。
    - 对不同错误（权限拒绝、不可用、超时）给出友好消息。
  - `getAddressFromCoords(lat, lng)`：
    - 目前为模拟实现（返回“模拟地址 (lat, lng)”），实际可接入高德/百度/Google 逆地理编码 API。
- **业务使用**
  - 首页 `Home.vue`：
    - 初始化时获取定位并通过 `PATCH /auth/location` 同步给后端，用于推荐附近订单。
  - 下单 `OrderCreate.vue` 与地址编辑 `AddressEdit.vue`：
    - 支持从当前位置一键带出地址（通过逆地理编码）。

### 2.8 聊天与联系人

- **`ChatModule` / `ChatController`**
  - 所有接口默认 `@UseGuards(JwtAuthGuard)`。
  - `GET /chat/history/:contactId`：获取与某个联系人的历史聊天记录。
  - `GET /chat/contacts`：获取近期聊天联系人列表（用于 `Messages.vue` 联系人列表）。
- **前端交互**
  - `Messages.vue`：展示最近联系人，会话入口。
  - `Chat.vue`：具体聊天窗口，通常会轮询或使用 WebSocket 获取新消息（实现取决于项目当前代码）。
- **与订单的结合**
  - 常见模式：客户与接单师傅可基于订单关系自动建立会话（由 `ChatService` 负责），Skill 使用时应优先复用现有会话/关系模型，而不是新建孤立聊天表。

### 2.9 管理后台 `admin/`

- **用途**
  - 后台主要用于：
    - 服务分类与价格配置。
    - 师傅审核与资料查看。
    - 订单与交易记录查看。
    - Banner 与平台参数（如佣金比例）管理。
- **技术栈**
  - Vue 2/3（视项目实际）+ Router。
  - 调用同一套 `backend` 接口（如 `OrdersModule`、`TransactionsModule`、`AuthModule` 等）。
- **开发建议**
  - 当新增/修改某个业务域（例如服务分类、提现审核），优先抽象为后端接口，再在：
    - 用户端 `frontend/` 中增加/调整对应页面。
    - 管理端 `admin/` 中增加运营入口。

### 2.10 配置与第三方支付

- **环境变量 `.env`**
  - 数据库：`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASS`、`DB_NAME`。
  - 支付宝：`ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`、`ALIPAY_GATEWAY`、`ALIPAY_NOTIFY_URL`。
  - 微信支付：`WECHAT_APPID`、`WECHAT_MCH_ID`、`WECHAT_SERIAL_NO`、`WECHAT_API_V3_KEY`、`WECHAT_PRIVATE_KEY`、`WECHAT_PUBLIC_KEY`、`WECHAT_NOTIFY_URL`。
  - JWT：`JWT_SECRET`。
- **使用指引**
  - 在本地/测试环境可以使用沙箱配置（如 `openapi.alipaydev.com`）。
  - Skill 驱动的改动在涉及支付逻辑时：
    - 不应将真实密钥写入仓库。
    - 应通过环境变量读取并在 `TransactionsModule` 或支付服务中统一使用。

### 2.11 订单接口与状态流转细节

- **`OrdersController` 主要接口**
  - `POST /orders`：创建订单（客户端下单），由 `OrdersService.create(userId, body)` 负责写入。
  - `GET /orders/pending`：获取待抢单列表（用于师傅端首页/大厅），支持基于查询参数的过滤。
  - `GET /orders/my`：按当前用户角色返回“我相关的订单”（客户看自己下的单，师傅看自己接的单）。
  - `POST /orders/:id/grab`：师傅抢单，需 `worker` 角色，否则抛出 `ForbiddenException`。
  - `PATCH /orders/:id/depart`：标记“师傅已出发”。
  - `PATCH /orders/:id/arrive`：标记“师傅已到达”，可选上传当前经纬度（用于风控与纠纷）。
  - `PATCH /orders/:id/start`：开始服务。
  - `PATCH /orders/:id/complete`：完成订单，同时可写入评分与内容（与 `RatingsModule` 联动）。
  - `PATCH /orders/:id/items`：更新 `completedItems` 列表，用于记录服务清单完成情况。
  - `GET /orders/:id/track`：订单实时追踪接口，返回：
    - `status`：当前订单状态。
    - `workerLocation`、`orderLocation`：客户与师傅的经纬度。
    - `distance`：两者之间的直线距离（公里）。
    - `etaMinutes`：按假定时速（30km/h）计算出的预计到达时间（分钟）。
  - `GET /orders/admin/all`：管理员查看全部订单列表（需 `admin` 角色）。
- **Skill 使用建议**
  - 更改订单流转时，优先调整 `OrdersService` 中对应方法，再确保控制器接口与前端调用保持兼容。
  - 若新增订单状态或操作（如“改约时间”、“上门失败”），需同步：
    - `OrderStatus` 枚举。
    - 订单实体字段与前端展示。
  - 若调整 ETA 计算逻辑（例如改用真实地图 API 路线距离和时长），只需修改 `OrdersService.trackOrder` 的距离/时间计算部分，前端 `Orders.vue` 通过轮询 `/orders/:id/track` 更新界面，无需改动接口协议。

### 2.12 评价系统与师傅详情

- **`RatingsController`**
  - `POST /ratings`：创建评价，参数中一般包含 `orderId`、`toUserId`、`score`、`content` 等。
  - `GET /ratings/user/:id`：获取某个用户收到的全部评价列表。
  - `GET /ratings/worker/:id`：获取师傅总体评分摘要（平均分、次数等），返回结构中包含 `success` 与 `data`。
- **`UsersController` 中的师傅详情**
  - `GET /users/worker/:id`：综合返回：
    - 师傅基础信息（头像、昵称、等级、评分、服务次数等）。
    - 评价列表（`score`、`content`、`createdAt`、评价人昵称与头像等）。
  - 前端 `WorkerDetail.vue` 可通过该接口一次性拉取展示信息。
- **Skill 使用建议**
  - 当扩展评价维度（如多维度打分、图文评价）时，优先改造 `RatingsService` 和返回 DTO，再微调 `UsersController` 的聚合结构，为前端提供尽量一次性的数据。

### 2.13 优惠券生命周期

- **`CouponsController` 接口**
  - `GET /coupons/active`：运营侧当前可领取的活动券列表。
  - `POST /coupons/claim`：用户领取指定 `couponId` 的优惠券，写入用户券关系表。
  - `GET /coupons/my`：获取“我的优惠券”，可通过 `status` 参数区分未使用/已使用/已过期。
  - `GET /coupons/applicable?amount=xxx`：根据当前订单金额返回可用券集合，前端 `OrderCreate.vue` 用其提示“X 张可用”。
- **Skill 使用建议**
  - 修改门槛金额或适用范围时，仅在后端 `CouponsService` 中修改规则，前端只读展示。
  - 若新增券类型（如满减、折扣、新人券），确保：
    - 结算逻辑中正确计算优惠金额。
    - `getApplicableCoupons` 根据新规则过滤。

### 2.14 通知中心

- **`NotificationsController`**
  - `GET /notifications`：获取当前用户所有通知列表（可用于消息中心页面）。
  - `GET /notifications/unread-count`：仅返回未读数量 `{ count }`，适合用于导航角标。
  - `PATCH /notifications/:id/read`：将单条通知标记为已读。
  - `POST /notifications/read-all`：一键全部已读。
- **Skill 使用建议**
  - 新增业务事件（如审核通过、提现进度、订单状态变化）时，优先在相应 Service 内调用 `NotificationsService` 发送通知，而不是直接在 Controller 中堆逻辑。
  - 若引入“强通知”（如短信/推送），应在 `NotificationsModule` 内增加渠道适配层。

### 2.15 提现审核流程

- **`WithdrawalsController`**
  - `POST /withdrawals`：用户发起提现申请，由 `TransactionsService.createWithdrawal` 处理。
  - `GET /withdrawals/admin/all`：管理员查看所有提现申请列表（需 `admin` 角色）。
  - `PATCH /withdrawals/:id/audit`：管理员审核（通过/拒绝），`status` 为 `WithdrawalStatus` 枚举值，可附加 `remark`。
- **Skill 使用建议**
  - 修改提现门槛、费率或限制时，集中在 `TransactionsService` 内实现。
  - 审核通过后通常需要：
    - 更新用户余额。
    - 记录交易流水（`transactions`）。
    - 发送通知（`NotificationsModule`）。

### 2.16 文件上传与前端使用模式

- **`FilesController` 上传规范**
  - 接口：`POST /files/upload`，字段名固定为 `file`（用于前端 `FormData.append('file', file)`）。
  - 存储：
    - 使用 `multer` + `diskStorage`，上传到 `./uploads` 目录。
    - 文件名为随机 32 位 hex + 原扩展名。
  - 响应：
    - `{ success: true, url: '/uploads/<filename>' }`。
  - 前端应拼接完整域名：`<origin> + url`，用于头像、证件照等展示。
- **Skill 使用建议**
  - 若后续迁移到 OSS / CDN，仅需调整 `FilesController` 返回的 `url` 生成逻辑，避免改动所有调用点。

### 2.17 地址簿操作细节

- **`AddressesService` 行为**
  - 新建与更新时，如果 `isDefault = true`：
    - 会先将该用户其他地址的 `isDefault` 全部置为 `false`，保证唯一默认地址。
  - `findAll(userId)`：默认地址优先，其次按创建时间倒序。
  - `setDefault(userId, id)`：单独设置默认地址时也会清空其他默认标记。
- **Skill 使用建议**
  - 前端在编辑地址时不需要额外处理“唯一默认”的逻辑，直接传 `isDefault` 即可，后端会保证一致性。

### 2.18 AI 客服与智能问答

- **后端 `AiSupportService`（`SupportModule` 内）**
  - 文件：`backend/src/support/ai-support.service.ts`。
  - 核心方法：`generateReply(userId, { message, orderId?, category? })`。
  - 实现结构：
    - 优先调用 **DeepSeek Chat Completion API** 生成回答；
    - 若未配置 `DEEPSEEK_API_KEY` 或调用失败，则回退到本地关键词/规则驱动的简易客服逻辑。
  - DeepSeek 调用要点：
    - 环境变量：
      - `DEEPSEEK_API_KEY`：DeepSeek 提供的密钥（**不要硬编码在仓库中**）。
      - 可选：`DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）、`DEEPSEEK_MODEL`（默认 `deepseek-chat`）。
    - 请求：
      - `POST {baseUrl}/chat/completions`，`Content-Type: application/json`，`Authorization: Bearer <DEEPSEEK_API_KEY>`。
      - Body 采用 OpenAI 兼容格式：
        - `model`: `deepseek-chat`（或通过环境变量配置）。
        - `messages`: `[ { role: 'system', content: <系统提示> }, { role: 'user', content: <用户问题+上下文> } ]`。
        - `max_tokens`: 512，`temperature`: 0.3 等。
    - 系统提示中明确：你是“好帮手”家政平台智能客服，需围绕家政业务（下单、改期、费用、优惠券、钱包提现、师傅结算、投诉赔付等）回答，语气亲切且用简体中文。
  - 本地规则兜底逻辑（当 DeepSeek 不可用时）仍保留，用于：
    - 订单时间与取消/改期规则。
    - 优惠券与活动使用说明。
    - 钱包余额、结算与提现流程。
    - 服务质量问题与赔付流程（投诉/差评/损坏）。
    - 服务范围与报价说明（包含/不包含）。
  - 未命中特定场景时，返回通用引导回复，并提示用户可继续追问或转人工客服。
  - 设计预留：若未来更换为其他大模型供应商，只需在 `callDeepSeek`（或等价私有方法）里替换 HTTP 调用逻辑，保持 `/support/ai-chat` 接口协议和 `AiSupportService.generateReply` 方法签名不变。
- **`SupportModule` 扩展**
  - 在 `support.module.ts` 中将 `AiSupportService` 注册为 `providers`/`exports`，与 `SupportService` 并存。
  - `SupportController` 新增接口：
    - `POST /support/ai-chat`：
      - 入参：`{ message: string; orderId?: number; category?: string }`。
      - 出参：`{ reply: string }`（也可附带 `message` 字段做兼容）。
  - 与现有工单接口配合使用：
    - 用户先通过 AI 客服进行自助问答；
    - 如未解决，可再通过 `POST /support/tickets` 提交人工工单，或由前端提供“转人工”入口。
- **前端集成（`Messages.vue` 消息中心）**
  - 在通知列表上方增加“AI 智能客服”卡片，包含：
    - 文本框 `aiQuestion` 输入问题（如“如何取消订单？”、“优惠券为什么不能用？”）。
    - 按钮 `问一问 AI 客服`，点击后调用 `POST /support/ai-chat`。
    - 状态变量：
      - `aiLoading` 控制按钮文案（“思考中…”）与禁用态。
      - `aiAnswer` 展示 AI 回复内容。
  - 使用方式：
    - 用户从“我的 - 帮助与客服”进入 `Messages.vue` 后，可以优先尝试 AI 自助问答。
    - 若 AI 回复不足以解决问题，页面可提供“转人工客服/提交工单”的后续操作入口（与 `SupportModule` 联动实现）。
  - Skill 使用建议：
    - 若要升级为真实大模型，只需替换 `AiSupportService.generateReply` 的实现，前端与调用接口不变。
    - 如需支持多轮对话，可以扩展 `/support/ai-chat` 入参/出参，增加 `sessionId`、对话历史摘要字段，并在前端维护当前会话上下文。

---

## 三、常见开发任务工作流（给 AI 代理的步骤提示）

### 3.1 新增/调整家政服务分类或价格

1. 在 **后端**：
   - 修改 `ServiceCategory` 实体或初始化逻辑（`ServiceCategoriesService.onModuleInit`）。
   - 若需多次卡，添加/调整对应 `ServicePackage` 数据。
2. 在 **前端**：
   - 确保 `Home.vue` 的“服务分类”宫格、`OrderCreate.vue` 的类型选择与默认价格使用最新字段：
     - `name`、`icon`、`basePrice`、`unit`、`checklist`、`exclusions`。
3. 若涉及**计费逻辑变化**（按平米、按次数等），同步更新：
   - 价格计算逻辑（前端显示 + 后端校验）。

### 3.2 改动订单状态或业务流转

1. 在后端定位：
   - `OrderStatus` 枚举。
   - `OrdersService` 与 `OrdersController` 中与状态修改相关的接口。
2. 设计新增状态或流转规则（例如增加“待验收”状态）。
3. 在前端更新：
   - 订单列表与详情展示新状态。
   - 按钮文案与可操作动作（如“去服务”、“确认完成”、“去支付”等）。

### 3.3 钱包与提现逻辑调整

1. 修改 `TransactionsService` 中钱包、佣金、提现的处理逻辑。
2. 若仅变更佣金比例，优先通过 `platform_configs` 中的 `commission_rate` 配置完成。
3. 同步前端：
   - `Wallet.vue` 中展示的金额说明。
   - `Withdraw.vue` 中的限制、文案与状态展示。

### 3.4 安全与权限

- 使用 `JwtAuthGuard` 限制接口访问。
- 管理员接口需显式检查：
  - `req.user.roles.includes('admin')`。
- 前端路由守卫（`frontend/src/router/index.js`）：
  - `to.meta.requiresAuth` && 未登录 => 跳转 `/login`。

---

## 四、使用本 Skill 时的思考顺序（给 AI 代理）

1. **判断需求归属的业务域**  
   用户的改动/问题是关于：登录注册、服务分类、订单发布与抢单、地址、钱包与提现、优惠券、评价、聊天、工单，还是文件上传？
2. **在后端模块中定位入口**  
   在 `backend/src` 中优先查找对应 Module、Controller、Service 和 Entity。
3. **同步前端、后台管理与数据库层面的改动**  
   确保字段名、枚举值、状态含义在前后端一致。
4. **注意角色与权限、金额与状态的一致性**  
   尤其是涉及身份校验（customer/worker/admin）、状态机变更、金额结算时。

---

## 五、支付与结算

### 5.1 支付流程概述

家政服务平台的支付体系是核心交易环节，涵盖从订单创建到资金分账的完整链路。整体流程分为以下阶段：

1. **订单创建**：用户提交订单，生成待支付订单（`OrderStatus.PENDING_PAY` 或 `PENDING = 0` 延伸）。
2. **发起支付**：前端调用支付接口，获取支付宝/微信支付参数。
3. **支付回调**：第三方支付平台通过回调接口通知支付结果。
4. **订单状态更新**：根据支付结果更新订单状态为 `PAID` 或 `PAY_FAILED`。
5. **资金结算**：支付成功后，根据佣金比例计算平台收入与师傅收入。
6. **提现流程**：师傅发起提现，平台审核后打款。

> **关键原则**：支付状态必须以第三方支付平台的异步通知为准，严禁仅依赖前端回调更新订单状态，防止恶意刷单。

### 5.2 支付状态枚举

在 `OrderStatus` 枚举中补充支付相关状态：

```typescript
export enum OrderStatus {
  PENDING = 0,           // 待抢单
  GRABBED = 1,           // 已接单/待出发
  DEPARTED = 5,          // 师傅已出发
  ARRIVED = 6,           // 师傅已到达
  STARTED = 7,           // 服务中
  COMPLETED = 2,         // 已完成/待支付
  PENDING_PAY = 8,       // 待支付（用户已确认服务，等待付款）
  PAYING = 9,            // 支付中（避免重复支付）
  PAID = 4,              // 已支付
  PAY_FAILED = 10,       // 支付失败
  CANCELLED = 3,         // 已取消
}
```

### 5.3 支付实体设计

**支付记录表 `payments` / 实体 `Payment`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `order_id` | number | 关联订单 ID |
| `user_id` | number | 支付用户 ID |
| `amount` | decimal(10,2) | 支付金额 |
| `pay_type` | enum | `alipay` / `wechat` |
| `trade_no` | string | 第三方支付订单号 |
| `out_trade_no` | string | 平台订单号（与 `order.orderNo` 关联） |
| `status` | enum | `pending` / `success` / `failed` / `closed` |
| `pay_params` | json | 支付参数（前端唤起支付所需） |
| `notify_data` | json | 第三方回调原始数据 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

**退款记录表 `refunds` / 实体 `Refund`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `order_id` | number | 关联订单 ID |
| `payment_id` | number | 关联支付记录 ID |
| `user_id` | number | 退款用户 ID |
| `amount` | decimal(10,2) | 退款金额 |
| `reason` | string | 退款原因 |
| `status` | enum | `pending` / `success` / `failed` / `rejected` |
| `refund_no` | string | 退款单号 |
| `trade_no` | string | 第三方退款交易号 |
| `created_at` | datetime | 创建时间 |
| `processed_at` | datetime | 处理时间 |

### 5.4 支付宝对接

**环境变量配置**：

```bash
# 支付宝
ALIPAY_APP_ID=2021000000000000
ALIPAY_PRIVATE_KEY="MIIE..."  # 应用私钥
ALIPAY_PUBLIC_KEY="MIIBIjAN..."  # 支付宝公钥
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/payment/alipay/notify
ALIPAY_RETURN_URL=https://your-domain.com/payment/alipay/return

# 沙箱环境
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do
```

**支付宝服务 `AlipayService`**：

```typescript
// backend/src/payment/alipay.service.ts
import { Injectable } from '@nestjs/common';
import AlipaySdk from 'alipay-sdk';
import AlipayFormData from 'alipay-sdk/lib/form';

@Injectable()
export class AlipayService {
  private alipaySdk: AlipaySdk;

  constructor() {
    this.alipaySdk = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
    });
  }

  // 创建支付订单
  async createPayment(order: Order, amount: number) {
    const formData = new AlipayFormData();
    formData.set('method', 'alipay.trade.app.pay');
    formData.addField('bizContent', {
      outTradeNo: order.orderNo,
      totalAmount: amount.toFixed(2),
      subject: `好帮手家政服务 - ${order.serviceType}`,
      body: `订单编号：${order.orderNo}`,
    });
    formData.addField('notifyUrl', process.env.ALIPAY_NOTIFY_URL);
    
    const result = await this.alipaySdk.exec(
      'alipay.trade.app.pay',
      {},
      { formData },
    );
    
    return {
      payParams: result,  // 直接返回给前端唤起 APP 支付
      tradeNo: order.orderNo,
    };
  }

  // 验签并处理回调
  async handleNotify(body: string, signature: string, signType: string) {
    const result = await this.alipaySdk.checkNotifySign(body, signature, signType);
    if (!result) {
      throw new ForbiddenException('支付宝签名验证失败');
    }
    
    const params = JSON.parse(body);
    const notifyData = params.alipay_trade_app_pay_response;
    
    return {
      outTradeNo: notifyData.out_trade_no,
      tradeNo: notifyData.trade_no,
      status: notifyData.trade_status === 'TRADE_SUCCESS' ? 'success' : 'pending',
      amount: notifyData.total_amount,
    };
  }

  // 申请退款
  async refund(order: Order, amount: number, reason: string) {
    const result = await this.alipaySdk.exec('alipay.trade.refund', {
      bizContent: {
        outTradeNo: order.orderNo,
        refundAmount: amount.toFixed(2),
        refundReason: reason,
      },
    });
    
    return result;
  }
}
```

### 5.5 微信支付对接

**环境变量配置**：

```bash
# 微信支付
WECHAT_APPID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_SERIAL_NO=CERT_SERIAL_NO
WECHAT_API_V3_KEY=api_v3_key_from_wechat
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."  # APIv3 私钥
WECHAT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."  # 微信支付公钥（验签用）
WECHAT_NOTIFY_URL=https://your-domain.com/payment/wechat/notify
WECHAT_REFUND_NOTIFY_URL=https://your-domain.com/payment/wechat/refund-notify
```

**微信支付服务 `WechatPayService`**：

```typescript
// backend/src/payment/wechat-pay.service.ts
import { Injectable } from '@nestjs/common';
import { WeChatPay } from 'wechatpay-node-v3';

@Injectable()
export class WechatPayService {
  private wechatPay: WeChatPay;

  constructor() {
    this.wechatPay = new WeChatPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCH_ID,
      serial: process.env.WECHAT_SERIAL_NO,
      privateKey: process.env.WECHAT_PRIVATE_KEY,
      apiV3Key: process.env.WECHAT_API_V3_KEY,
    });
  }

  // 创建支付订单（JSAPI 公众号支付）
  async createPayment(order: Order, amount: number, openid: string) {
    const result = await this.wechatPay.transactions_jsapi({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCH_ID,
      description: `好帮手家政服务 - ${order.serviceType}`,
      out_trade_no: order.orderNo,
      amount: {
        total: Math.round(amount * 100),  // 单位：分
      },
      payer: {
        openid,
      },
      notify_url: process.env.WECHAT_NOTIFY_URL,
    });
    
    return result;
  }

  // 处理回调
  async handleNotify(body: any, signature: string, timestamp: string, nonce: string) {
    try {
      // 验签
      await this.wechatPay.verify(signature, timestamp, nonce, body);
      
      const resource = body.resource;
      const ciphertext = resource.ciphertext;
      
      // 解密
      const decrypted = this.wechatPay.decipher(
        ciphertext,
        resource.associated_data,
        resource.nonce,
      );
      
      return {
        outTradeNo: decrypted.out_trade_no,
        tradeNo: decrypted.transaction_id,
        status: decrypted.trade_state === 'SUCCESS' ? 'success' : 'pending',
        amount: decrypted.amount.total / 100,
      };
    } catch (error) {
      throw new ForbiddenException('微信支付签名验证失败');
    }
  }

  // 申请退款
  async refund(order: Order, amount: number, reason: string) {
    const result = await this.wechatPay.refunds({
      out_trade_no: order.orderNo,
      out_refund_no: `REFUND_${Date.now()}_${order.id}`,
      amount: {
        refund: Math.round(amount * 100),
        total: Math.round(amount * 100),
      },
      reason,
      notify_url: process.env.WECHAT_REFUND_NOTIFY_URL,
    });
    
    return result;
  }
}
```

### 5.6 支付回调处理

**支付回调控制器 `PaymentController`**：

```typescript
// backend/src/payment/payment.controller.ts
@Controller('payment')
export class PaymentController {
  constructor(
    private alipayService: AlipayService,
    private wechatPayService: WechatPayService,
    private ordersService: OrdersService,
    private transactionsService: TransactionsService,
  ) {}

  // 支付宝回调
  @Post('alipay/notify')
  async alipayNotify(
    @Body() body: any,
    @Headers('signatures') signature: string,
  ) {
    const result = await this.alipayService.handleNotify(body, signature);
    
    await this.handlePaymentResult(result);
    
    return 'success';
  }

  // 微信回调
  @Post('wechat/notify')
  async wechatNotify(
    @Body() body: any,
    @Headers('wechatpay-signature') signature: string,
    @Headers('wechatpay-timestamp') timestamp: string,
    @Headers('wechatpay-nonce') nonce: string,
  ) {
    const result = await this.wechatPayService.handleNotify(
      body, signature, timestamp, nonce,
    );
    
    await this.handlePaymentResult(result);
    
    return { code: 'SUCCESS', message: '成功' };
  }

  // 统一处理支付结果
  private async handlePaymentResult(result: PaymentResult) {
    const order = await this.ordersService.findByOrderNo(result.outTradeNo);
    
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 更新支付记录
    await this.updatePaymentRecord(result);
    
    if (result.status === 'success') {
      // 订单状态：已完成 -> 已支付
      await this.ordersService.updateStatus(order.id, OrderStatus.PAID);
      
      // 记录交易流水（客户支出）
      await this.transactionsService.create({
        userId: order.customerId,
        orderId: order.id,
        type: 'payment',
        amount: -result.amount,
        balanceAfter: await this.getUserBalance(order.customerId),
        status: 'success',
      });

      // 发送支付成功通知
      await this.sendPaymentSuccessNotification(order);
    } else {
      // 支付失败，更新订单状态
      await this.ordersService.updateStatus(order.id, OrderStatus.PAY_FAILED);
    }
  }
}
```

### 5.7 退款流程

**退款策略设计**：

| 场景 | 退款比例 | 说明 |
|-----|---------|------|
| 师傅迟到 ≥ 30分钟 | 100% | 全额退款 |
| 师傅爽约 | 100% | 全额退款 + 赔偿 |
| 服务质量投诉成立 | 50%-100% | 按实际情况 |
| 客户主动取消（服务前24h） | 100% | 无条件全额 |
| 客户主动取消（服务前2-24h） | 80% | 扣除20%违约金 |
| 客户主动取消（服务前2h内） | 50% | 扣除50%违约金 |

**退款服务 `RefundService`**：

```typescript
// backend/src/payment/refund.service.ts
@Injectable()
export class RefundService {
  constructor(
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
    private alipayService: AlipayService,
    private wechatPayService: WechatPayService,
    private transactionsService: TransactionsService,
    private notificationsService: NotificationsService,
  ) {}

  // 创建退款申请
  async createRefund(userId: number, orderId: number, reason: string) {
    const order = await this.ordersService.findOne(orderId);
    
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('当前订单状态不支持退款');
    }

    const payment = await this.paymentsService.findByOrderId(orderId);
    const refundAmount = this.calculateRefundAmount(order, reason);
    
    const refund = await this.refundsRepository.save({
      orderId,
      paymentId: payment.id,
      userId,
      amount: refundAmount,
      reason,
      status: 'pending',
      refundNo: `REFUND_${Date.now()}_${orderId}`,
    });

    // 创建退款工单，进入审核流程
    await this.createRefundTicket(refund);

    return refund;
  }

  // 计算退款金额
  private calculateRefundAmount(order: Order, reason: string): number {
    const hoursUntilService = differenceInHours(
      new Date(order.serviceTime),
      new Date(),
    );

    // 根据取消时间计算
    if (hoursUntilService > 24) {
      return order.amount;  // 100% 退款
    } else if (hoursUntilService > 2) {
      return order.amount * 0.8;  // 80% 退款
    } else {
      return order.amount * 0.5;  // 50% 退款
    }
  }

  // 处理退款（审核通过后调用）
  async processRefund(refundId: number) {
    const refund = await this.refundsRepository.findOne(refundId);
    
    if (refund.status !== 'pending') {
      throw new BadRequestException('退款申请状态异常');
    }

    const payment = await this.paymentsService.findOne(refund.paymentId);

    try {
      // 调用第三方支付退款
      if (payment.payType === 'alipay') {
        await this.alipayService.refund(order, refund.amount, refund.reason);
      } else {
        await this.wechatPayService.refund(order, refund.amount, refund.reason);
      }

      // 更新退款状态
      await this.refundsRepository.update(refundId, {
        status: 'success',
        processedAt: new Date(),
      });

      // 更新订单状态
      await this.ordersService.updateStatus(refund.orderId, OrderStatus.REFUNDED);

      // 记录交易流水
      await this.transactionsService.create({
        userId: refund.userId,
        orderId: refund.orderId,
        type: 'refund',
        amount: refund.amount,
        balanceAfter: await this.getUserBalance(refund.userId),
        status: 'success',
      });

      // 发送退款成功通知
      await this.notificationsService.send(
        refund.userId,
        '退款已到账',
        `您的订单已退款，退款金额 ¥${refund.amount} 已原路返回。`,
      );
    } catch (error) {
      await this.refundsRepository.update(refundId, {
        status: 'failed',
        remark: error.message,
      });
      throw error;
    }
  }
}
```

### 5.8 订单金额结算

**结算服务 `SettlementService`**：

```typescript
// backend/src/payment/settlement.service.ts
@Injectable()
export class SettlementService {
  constructor(
    private configService: ConfigService,
    private transactionsService: TransactionsService,
  ) {}

  // 计算订单各方收益
  async settleOrder(order: Order, paymentAmount: number) {
    const commissionRate = await this.getCommissionRate();
    const commissionAmount = paymentAmount * commissionRate;
    const workerAmount = paymentAmount - commissionAmount;

    // 记录平台佣金收入
    await this.transactionsService.create({
      userId: 0,  // 平台账户
      orderId: order.id,
      type: 'commission',
      amount: commissionAmount,
      balanceAfter: 0,
      status: 'success',
    });

    // 预生成师傅收入记录（待确认）
    await this.transactionsService.create({
      userId: order.workerId,
      orderId: order.id,
      type: 'income',
      amount: workerAmount,
      balanceAfter: await this.getUserBalance(order.workerId) + workerAmount,
      status: 'pending',  // 待订单完成后确认
    });

    return {
      totalAmount: paymentAmount,
      commissionRate,
      commissionAmount,
      workerAmount,
    };
  }

  // 订单完成后确认收入
  async confirmIncome(orderId: number) {
    const pendingIncome = await this.transactionsService.findPendingIncome(orderId);
    
    if (pendingIncome) {
      await this.transactionsRepository.update(pendingIncome.id, {
        status: 'success',
      });
    }
  }
}
```

### 5.9 支付安全要点

**关键安全措施**：

1. **验签是必须**：所有支付回调必须验签，验签失败直接返回失败，不处理业务。
2. **幂等性处理**：同一订单号的回调可能多次到达，需做去重处理。
3. **金额校验**：验证回调金额与订单金额是否一致，防止篡改。
4. **状态机闭环**：只有状态为 `PAID` 的订单才能进入后续流程。
5. **日志完整**：记录完整的请求/响应，便于事后审计和排查。

**订单金额流向示例**（佣金比例 10%）：

| 角色 | 金额 | 说明 |
|-----|------|------|
| 客户支付 | ¥100.00 | 订单实付金额 |
| 平台佣金 | ¥10.00 | 10% |
| 师傅收入 | ¥90.00 | 90%（待确认） |
| 师傅提现 | ¥90.00 | 提现时扣除提现手续费后到账 |

> **配置管理**：佣金比例通过 `platform_configs` 表配置，支持运营后台动态调整。

### 5.10 支付接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/payment/alipay/notify` | POST | 支付宝异步回调 | 无需鉴权 |
| `/payment/wechat/notify` | POST | 微信支付异步回调 | 无需鉴权 |
| `/payment/create` | POST | 发起支付（获取支付参数） | 用户 |
| `/payment/detail/:orderId` | GET | 支付详情 | 用户 |
| `/payment/refund` | POST | 申请退款 | 用户 |
| `/payment/refund/list` | GET | 退款列表 | 用户/管理员 |
| `/payment/refund/:id/process` | POST | 处理退款（审核） | 管理员 |

---

## 六、实时通讯与消息推送

### 6.1 WebSocket 架构

实时通讯是提升用户体验的关键环节，主要用于订单状态变更通知、聊天消息实时推送、系统公告推送等场景。推荐使用 **Socket.io** 作为 WebSocket 解决方案：

```bash
# 安装依赖
npm install socket.io socket.io-client @nestjs/platform-socket.io
```

**WebSocket 网关 `EventsGateway`**：

```typescript
// backend/src/events/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, Set<string>> = new Map();  // userId -> socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      
      client.data.userId = payload.sub;
      client.data.roles = payload.roles;

      // 记录用户 socket
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub).add(client.id);

      // 加入用户私有房间
      client.join(`user:${payload.sub}`);

      // 如果是师傅，加入师傅专属房间
      if (payload.roles.includes('worker')) {
        client.join('workers');
      }

      console.log(`Client connected: ${client.id}, userId: ${payload.sub}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  // 发送订单状态变更通知
  @SubscribeMessage('order:status')
  async handleOrderStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number; status: string },
  ) {
    const order = await this.ordersService.findOne(data.orderId);
    
    // 通知客户
    this.server.to(`user:${order.customerId}`).emit('notification', {
      type: 'order_status',
      title: '订单状态更新',
      message: `您的订单状态已变更为：${data.status}`,
      data: { orderId: data.orderId, status: data.status },
      timestamp: new Date(),
    });

    // 通知师傅（如果已接单）
    if (order.workerId) {
      this.server.to(`user:${order.workerId}`).emit('notification', {
        type: 'order_status',
        title: '订单状态更新',
        message: `订单状态已变更为：${data.status}`,
        data: { orderId: data.orderId, status: data.status },
        timestamp: new Date(),
      });
    }
  }

  // 聊天消息实时推送
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { toUserId: number; content: string; orderId?: number },
  ) {
    const fromUserId = client.data.userId;
    
    // 保存消息到数据库
    const message = await this.chatService.saveMessage({
      fromUserId,
      toUserId: data.toUserId,
      content: data.content,
      orderId: data.orderId,
    });

    // 推送给接收方
    this.server.to(`user:${data.toUserId}`).emit('chat:message', {
      id: message.id,
      fromUserId,
      content: data.content,
      timestamp: message.createdAt,
      orderId: data.orderId,
    });

    // 确认送达
    client.emit('chat:delivered', { messageId: message.id });
  }

  // 广播系统公告
  async broadcastSystemMessage(title: string, content: string) {
    this.server.emit('system:announcement', {
      title,
      content,
      timestamp: new Date(),
    });
  }
}
```

### 6.2 消息实体设计

**消息表 `messages` / 实体 `Message`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `conversation_id` | number | 会话 ID |
| `from_user_id` | number | 发送者 ID |
| `to_user_id` | number | 接收者 ID |
| `order_id` | number | 关联订单 ID（可空） |
| `content` | text | 消息内容 |
| `type` | enum | `text` / `image` / `voice` / `location` |
| `status` | enum | `sent` / `delivered` / `read` |
| `created_at` | datetime | 创建时间 |

**会话表 `conversations` / 实体 `Conversation`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_a_id` | number | 用户 A |
| `user_b_id` | number | 用户 B |
| `order_id` | number | 关联订单 ID（可空，用于订单相关会话） |
| `last_message_id` | number | 最后一条消息 ID |
| `last_message_at` | datetime | 最后消息时间 |
| `unread_count_a` | number | 用户 A 未读数 |
| `unread_count_b` | number | 用户 B 未读数 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

### 6.3 推送场景

**核心推送场景**：

| 场景 | 触发时机 | 推送对象 | 推送内容 |
|-----|---------|---------|---------|
| 新订单通知 | 订单创建后 | 附近师傅 | 订单基本信息、距离 |
| 订单被抢 | 师傅抢单成功 | 客户 | 师傅信息、联系方式 |
| 师傅出发 | 师傅点击"出发" | 客户 | 预计到达时间 |
| 师傅到达 | 师傅点击"到达" | 客户 | 通知客户准备 |
| 服务完成 | 师傅点击"完成" | 客户 | 待支付、待评价 |
| 支付成功 | 支付回调确认 | 师傅 | 收入已入账 |
| 新消息 | 聊天消息发送 | 接收方 | 消息内容 |
| 系统公告 | 管理员发布 | 全体用户 | 公告内容 |
| 提现到账 | 提现审核通过 | 师傅 | 到账金额 |

### 6.4 消息类型枚举

```typescript
// backend/src/chat/enums/message-type.enum.ts
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
  LOCATION = 'location',
  SYSTEM = 'system',
}

// backend/src/chat/enums/notification-type.enum.ts
export enum NotificationType {
  ORDER_CREATED = 'order_created',       // 新订单
  ORDER_GRABBED = 'order_grabbed',       // 订单被抢
  ORDER_DEPARTED = 'order_departed',     // 师傅出发
  ORDER_ARRIVED = 'order_arrived',       // 师傅到达
  ORDER_STARTED = 'order_started',       // 开始服务
  ORDER_COMPLETED = 'order_completed',   // 服务完成
  ORDER_PAID = 'order_paid',             // 支付成功
  ORDER_CANCELLED = 'order_cancelled',   // 订单取消
  NEW_MESSAGE = 'new_message',           // 新消息
  SYSTEM_ANNOUNCEMENT = 'system_announcement',  // 系统公告
  WITHDRAWAL_SUCCESS = 'withdrawal_success',   // 提现到账
  REVIEW_RECEIVED = 'review_received',   // 收到评价
}
```

### 6.5 房间机制设计

**房间命名规范**：

| 房间类型 | 房间名格式 | 说明 |
|---------|-----------|------|
| 用户私聊 | `user:{userId}` | 只推送该用户的私人消息 |
| 师傅频道 | `workers` | 推送订单大厅消息给所有在线师傅 |
| 订单会话 | `order:{orderId}` | 订单相关的多方会话 |
| 系统广播 | `broadcast` | 系统公告推送给所有用户 |

### 6.6 前端 WebSocket 集成

**WebSocket 服务 `socketService.ts`**：

```typescript
// frontend/src/services/socket.js
import { io } from 'socket.io-client';

class SocketService {
  socket = null;
  callbacks = {};

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(`${process.env.VUE_APP_WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    // 监听通知
    this.socket.on('notification', (data) => {
      this.trigger('notification', data);
      this.showNotificationToast(data);
    });

    // 监听聊天消息
    this.socket.on('chat:message', (data) => {
      this.trigger('chat:message', data);
    });

    // 监听系统公告
    this.socket.on('system:announcement', (data) => {
      this.showAnnouncementModal(data);
    });
  }

  // 发送聊天消息
  sendChatMessage(toUserId, content, orderId = null) {
    this.socket.emit('chat:message', { toUserId, content, orderId });
  }

  // 订阅事件
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  // 触发事件
  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  // 显示通知 Toast
  showNotificationToast(data) {
    uni.showToast({
      title: data.title,
      icon: 'none',
      duration: 3000,
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export default new SocketService();
```

### 6.7 消息接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/ws` | WebSocket | WebSocket 连接 | JWT |
| `/chat/conversations` | GET | 获取会话列表 | 用户 |
| `/chat/history/:contactId` | GET | 获取聊天记录 | 用户 |
| `/chat/messages/:conversationId` | GET | 获取会话消息 | 用户 |
| `/chat/messages/read` | POST | 标记消息已读 | 用户 |
| `/notifications` | GET | 获取通知列表 | 用户 |
| `/notifications/unread-count` | GET | 未读通知数量 | 用户 |
| `/notifications/:id/read` | PATCH | 标记通知已读 | 用户 |
| `/notifications/broadcast` | POST | 发送系统广播 | 管理员 |

### 6.8 消息推送与现有系统集成

**与 NotificationsModule 集成**：

```typescript
// 在订单状态变更时同时发送 WebSocket 通知和站内通知
@Injectable()
export class OrdersService {
  constructor(
    private notificationsService: NotificationsService,
    private eventsGateway: EventsGateway,
  ) {}

  async updateOrderStatus(orderId: number, newStatus: OrderStatus) {
    const order = await this.update(orderId, { status: newStatus });

    // 发送 WebSocket 实时通知
    this.eventsGateway.server.to(`user:${order.customerId}`).emit('notification', {
      type: 'order_status',
      title: '订单状态更新',
      message: `您的订单已${this.getStatusText(newStatus)}`,
      data: { orderId, status: newStatus },
    });

    // 发送站内通知（持久化）
    await this.notificationsService.create({
      userId: order.customerId,
      type: NotificationType.ORDER_STATUS,
      title: '订单状态更新',
      content: `您的订单已${this.getStatusText(newStatus)}`,
      data: { orderId, status: newStatus },
    });

    return order;
  }
}
```

---

## 七、师傅端完整工作流

### 7.1 师傅接单条件

师傅接单需要满足以下前置条件：

1. **身份认证**：师傅已完成实名认证（`audit_status = 1`）。
2. **在线状态**：师傅设置在线（`isOnline = true`）。
3. **接单开关**：师傅开启接单功能（`canReceiveOrder = true`）。
4. **服务范围**：订单地址在师傅服务半径内。
5. **技能匹配**：订单服务类型属于师傅的技能标签。
6. **接单上限**：当日接单数未达到上限（通过 `platform_configs` 配置，默认 10 单/天）。
7. **信用分要求**：信用分 ≥ 60 分（低于 60 分限制接单）。

**师傅在线状态表 `worker_online_status` / 实体 `WorkerOnlineStatus`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 师傅用户 ID |
| `is_online` | boolean | 是否在线 |
| `can_receive_order` | boolean | 是否开启接单 |
| `current_lat` | decimal | 当前纬度 |
| `current_lng` | decimal | 当前经度 |
| `last_active_at` | datetime | 最后活跃时间 |
| `today_order_count` | number | 今日接单数 |
| `today_completed_count` | number | 今日完成数 |

### 7.2 师傅端首页设计

**师傅端首页 `WorkerHome.vue`**：

```vue
<template>
  <div class="worker-home">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="online-toggle">
        <span>接单状态：{{ canReceiveOrder ? '已开启' : '已关闭' }}</span>
        <switch :checked="canReceiveOrder" @change="toggleReceiveOrder" />
      </div>
      <div class="today-stats">
        <text>今日完成：{{ todayCompletedCount }}单</text>
        <text>今日收入：¥{{ todayIncome }}</text>
      </div>
    </div>

    <!-- 待抢订单列表 -->
    <div class="order-list" v-if="pendingOrders.length > 0">
      <div 
        class="order-card" 
        v-for="order in pendingOrders" 
        :key="order.id"
        @click="viewOrderDetail(order)"
      >
        <div class="order-header">
          <text class="service-type">{{ order.serviceType }}</text>
          <text class="order-amount">¥{{ order.amount }}</text>
        </div>
        <div class="order-info">
          <text class="service-time">预约：{{ formatTime(order.serviceTime) }}</text>
          <text class="distance">距离：{{ order.distance }}km</text>
        </div>
        <div class="order-address">
          <text>{{ order.location }} {{ order.addressDetail }}</text>
        </div>
        <button class="grab-btn" @click.stop="grabOrder(order.id)">抢单</button>
      </div>
    </div>
    <div class="empty-state" v-else>
      <text>暂无可抢订单</text>
    </div>

    <!-- 我的订单入口 -->
    <div class="my-orders">
      <navigator url="/pages/orders/my">我的订单</navigator>
    </div>
  </div>
</template>
```

### 7.3 抢单流程

**抢单接口实现**：

```typescript
// backend/src/orders/orders.controller.ts
@Post(':id/grab')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('worker')
async grabOrder(
  @Param('id') id: number,
  @Req() req,
) {
  return this.ordersService.grabOrder(id, req.user);
}

// backend/src/orders/orders.service.ts
async grabOrder(orderId: number, worker: User) {
  const order = await this.ordersRepository.findOne(orderId, {
    relations: ['worker'],
  });

  // 1. 验证订单状态
  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('该订单已被抢或已取消');
  }

  // 2. 验证师傅资质
  const workerProfile = await this.workerProfilesService.findByUserId(worker.id);
  if (workerProfile.audit_status !== 1) {
    throw new ForbiddenException('您尚未通过实名认证，无法接单');
  }

  if (workerProfile.credit_score < 60) {
    throw new ForbiddenException('您的信用分过低，暂无法接单');
  }

  // 3. 验证在线状态和接单开关
  const onlineStatus = await this.getOnlineStatus(worker.id);
  if (!onlineStatus?.can_receive_order) {
    throw new BadRequestException('请先开启接单功能');
  }

  // 4. 验证接单上限
  if (onlineStatus.today_order_count >= this.configService.get('MAX_DAILY_ORDERS')) {
    throw new BadRequestException('今日接单数已达上限');
  }

  // 5. 验证服务范围（订单地址在师傅服务半径内）
  const distance = this.calculateDistance(
    onlineStatus.current_lat,
    onlineStatus.current_lng,
    order.lat,
    order.lng,
  );
  const maxServiceRadius = this.configService.get('MAX_SERVICE_RADIUS', 50);  // 默认50km
  if (distance > maxServiceRadius) {
    throw new BadRequestException('该订单超出您的服务范围');
  }

  // 6. 验证技能匹配
  const workerSkills = workerProfile.skills || [];
  if (!workerSkills.includes(order.serviceType)) {
    throw new BadRequestException('该订单类型不在您的服务技能范围内');
  }

  // 7. 使用分布式锁防止并发抢单
  const lock = await this.redisLock.acquire(`order:${orderId}:grab`, 5000);
  if (!lock) {
    throw new ConflictException('订单正在被抢，请稍后重试');
  }

  try {
    // 双重验证（加锁后再次检查状态）
    const freshOrder = await this.ordersRepository.findOne(orderId);
    if (freshOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException('该订单已被抢');
    }

    // 更新订单
    await this.ordersRepository.update(orderId, {
      workerId: worker.id,
      status: OrderStatus.GRABBED,
      grabbedAt: new Date(),
    });

    // 更新师傅今日接单数
    await this.incrementTodayOrderCount(worker.id);

    // 发送通知给客户
    await this.notifyCustomerOrderGrabbed(orderId, worker.id);

    // 创建会话（客户与师傅可以聊天）
    await this.chatService.createOrderConversation(orderId, worker.id);

    return {
      success: true,
      message: '抢单成功',
      order: await this.ordersRepository.findOne(orderId),
    };
  } finally {
    await this.redisLock.release(lock);
  }
}
```

### 7.4 师傅工作流状态机

师傅端完整工作流涉及以下状态变更：

```
待抢单(PENDING) → 已接单(GRABBED) → 已出发(DEPARTED) → 已到达(ARRIVED) → 服务中(STARTED) → 已完成(COMPLETED)
```

**状态变更接口**：

| 接口 | 方法 | 说明 | 业务逻辑 |
|-----|------|------|---------|
| `/orders/:id/grab` | POST | 师傅抢单 | 设置 `workerId`、`status = GRABBED` |
| `/orders/:id/depart` | PATCH | 出发 | `status = DEPARTED`，记录出发时间 |
| `/orders/:id/arrive` | PATCH | 到达 | `status = ARRIVED`，记录到达经纬度 |
| `/orders/:id/start` | PATCH | 开始服务 | `status = STARTED`，记录开始时间 |
| `/orders/:id/complete` | PATCH | 完成服务 | `status = COMPLETED`，记录完成时间 |
| `/orders/:id/cancel` | PATCH | 取消订单（师傅端） | 需审核，扣除信用分 |

**师傅端订单详情页状态展示**：

```vue
<template>
  <div class="worker-order-detail">
    <!-- 状态进度条 -->
    <div class="status-progress">
      <div 
        class="step" 
        :class="{ active: currentStatus >= 1 }"
      >
        <div class="step-icon">1</div>
        <text>已接单</text>
      </div>
      <div class="line" :class="{ active: currentStatus >= 5 }"></div>
      <div 
        class="step" 
        :class="{ active: currentStatus >= 5 }"
      >
        <div class="step-icon">2</div>
        <text>已出发</text>
      </div>
      <div class="line" :class="{ active: currentStatus >= 6 }"></div>
      <div 
        class="step" 
        :class="{ active: currentStatus >= 6 }"
      >
        <div class="step-icon">3</div>
        <text>已到达</text>
      </div>
      <div class="line" :class="{ active: currentStatus >= 7 }"></div>
      <div 
        class="step" 
        :class="{ active: currentStatus >= 2 }"
      >
        <div class="step-icon">4</div>
        <text>已完成</text>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button 
        v-if="currentStatus === 1" 
        @click="markDeparted"
      >
        出发
      </button>
      <button 
        v-if="currentStatus === 5" 
        @click="markArrived"
      >
        到达
      </button>
      <button 
        v-if="currentStatus === 6" 
        @click="markStarted"
      >
        开始服务
      </button>
      <button 
        v-if="currentStatus === 7" 
        @click="markCompleted"
      >
        完成服务
      </button>
    </div>
  </div>
</template>
```

### 7.5 师傅收入明细

**师傅收入记录表 `worker_income_records` / 实体 `WorkerIncomeRecord`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 师傅用户 ID |
| `order_id` | number | 关联订单 ID |
| `amount` | decimal(10,2) | 收入金额 |
| `commission_rate` | decimal(5,4) | 佣金比例 |
| `commission_amount` | decimal(10,2) | 佣金金额 |
| `net_amount` | decimal(10,2) | 实际收入 |
| `status` | enum | `pending` / `available` / `withdrawn` |
| `settled_at` | datetime | 结算时间 |
| `created_at` | datetime | 创建时间 |

**师傅收入查询接口**：

```typescript
// backend/src/orders/orders.controller.ts
@Get('worker/income')
@UseGuards(JwtAuthGuard)
@Roles('worker')
async getWorkerIncome(@Req() req) {
  return this.ordersService.getWorkerIncomeSummary(req.user.id);
}

// backend/src/orders/orders.service.ts
async getWorkerIncomeSummary(workerId: number) {
  // 待入账（已完成但未支付）
  const pendingIncome = await this.incomeRecordsRepository
    .createQueryBuilder('record')
    .where('record.user_id = :workerId', { workerId })
    .andWhere('record.status = :status', { status: 'pending' })
    .select('SUM(record.net_amount)', 'total')
    .getRawOne();

  // 已入账（可提现）
  const availableIncome = await this.incomeRecordsRepository
    .createQueryBuilder('record')
    .where('record.user_id = :workerId', { workerId })
    .andWhere('record.status = :status', { status: 'available' })
    .select('SUM(record.net_amount)', 'total')
    .getRawOne();

  // 已提现
  const withdrawnIncome = await this.transactionsRepository
    .createQueryBuilder('t')
    .where('t.user_id = :workerId', { workerId })
    .andWhere('t.type = :type', { type: 'withdrawal' })
    .andWhere('t.status = :status', { status: 'success' })
    .select('SUM(t.amount)', 'total')
    .getRawOne();

  // 最近收入记录
  const recentRecords = await this.incomeRecordsRepository.find({
    where: { userId: workerId },
    order: { createdAt: 'DESC' },
    take: 10,
  });

  return {
    pending: pendingIncome?.total || 0,
    available: availableIncome?.total || 0,
    withdrawn: Math.abs(withdrawnIncome?.total || 0),
    recentRecords,
  };
}
```

### 7.6 师傅等级与信用体系

**师傅等级表 `worker_levels` / 实体 `WorkerLevel`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `level` | number | 等级序号 |
| `name` | string | 等级名称（新手、铜牌、银牌、金牌、钻石） |
| `min_service_count` | number | 最低服务次数 |
| `min_rating` | decimal(3,2) | 最低评分 |
| `commission_rate` | decimal(5,4) | 佣金比例（等级越高，佣金越低） |
| `benefits` | json | 等级权益 |

**师傅信用分规则**：

| 行为 | 信用分变化 | 说明 |
|-----|-----------|------|
| 正常完成订单 | +1 | 最高 100 分 |
| 收到好评（5星） | +2 | 单次 |
| 收到差评（1-2星） | -5 | 单次 |
| 订单准时完成 | +0.5 | 每次 |
| 迟到 ≥ 30分钟 | -3 | 单次 |
| 爽约（未提前通知） | -10 | 单次 |
| 主动取消订单 | -2 | 单次 |
| 客户投诉成立 | -5 | 单次 |
| 信用分恢复 | +1/天 | 每日上限 |

**师傅等级与佣金比例示例**：

| 等级 | 服务次数 | 评分要求 | 佣金比例 |
|-----|---------|---------|---------|
| 新手 | 0-9 | 无 | 15% |
| 铜牌 | 10-49 | ≥4.5 | 12% |
| 银牌 | 50-199 | ≥4.7 | 10% |
| 金牌 | 200-499 | ≥4.8 | 8% |
| 钻石 | ≥500 | ≥4.9 | 5% |

### 7.7 师傅端接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/orders/pending` | GET | 获取待抢订单列表 | 师傅 |
| `/orders/:id/grab` | POST | 抢单 | 师傅 |
| `/orders/my` | GET | 我的订单 | 师傅/客户 |
| `/orders/:id/depart` | PATCH | 出发 | 师傅 |
| `/orders/:id/arrive` | PATCH | 到达 | 师傅 |
| `/orders/:id/start` | PATCH | 开始服务 | 师傅 |
| `/orders/:id/complete` | PATCH | 完成服务 | 师傅 |
| `/orders/:id/cancel` | PATCH | 取消订单（需审核） | 师傅 |
| `/worker/online-status` | GET/PATCH | 在线状态管理 | 师傅 |
| `/worker/income` | GET | 收入明细 | 师傅 |
| `/worker/level` | GET | 当前等级信息 | 师傅 |
| `/worker/credit` | GET | 信用分详情 | 师傅 |
| `/worker/stats` | GET | 工作统计数据 | 师傅 |
| `/worker/orders/today` | GET | 今日订单列表 | 师傅 |

---

## 八、纠纷与保障体系

### 8.1 投诉与纠纷处理流程

家政服务中难免出现服务质量问题，建立完善的纠纷处理机制是提升用户信任的关键。整体流程如下：

```
用户投诉 → 客服接入 → 证据收集 → 责任判定 → 处理方案 → 执行落实 → 结果反馈
```

**投诉表 `complaints` / 实体 `Complaint`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `order_id` | number | 关联订单 ID |
| `complainant_id` | number | 投诉人 ID（客户或师傅） |
| `respondent_id` | number | 被投诉人 ID |
| `type` | enum | `service_quality` / `attitude` / `damage` / `delay` / `other` |
| `reason` | string | 投诉原因 |
| `description` | text | 详细描述 |
| `evidence_images` | json | 证据图片列表 |
| `status` | enum | `pending` / `investigating` / `resolved` / `closed` |
| `investigator_id` | number | 处理人员 ID |
| `result` | string | 处理结果 |
| `compensation_amount` | decimal(10,2) | 赔偿金额 |
| `created_at` | datetime | 投诉时间 |
| `resolved_at` | datetime | 解决时间 |

### 8.2 投诉类型枚举

```typescript
// backend/src/complaints/enums/complaint-type.enum.ts
export enum ComplaintType {
  SERVICE_QUALITY = 'service_quality',     // 服务质量（清洁不干净等）
  ATTITUDE = 'attitude',                    // 服务态度
  DAMAGE = 'damage',                        // 物品损坏
  DELAY = 'delay',                          // 迟到/爽约
  NO_SHOW = 'no_show',                      // 师傅未到
  PRICE = 'price',                          // 费用争议
  OTHER = 'other',                          // 其他
}

// backend/src/complaints/enums/complaint-status.enum.ts
export enum ComplaintStatus {
  PENDING = 'pending',       // 待受理
  INVESTIGATING = 'investigating',  // 调查中
  MEDIATING = 'mediating',   // 调解中
  RESOLVED = 'resolved',     // 已解决
  CLOSED = 'closed',         // 已关闭
}
```

### 8.3 服务保险机制

**保险配置表 `insurance_configs` / 实体 `InsuranceConfig`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `name` | string | 保险名称 |
| `type` | enum | `order` / `personal_accident` / `property` |
| `coverage_amount` | decimal(10,2) | 保额 |
| `premium` | decimal(10,2) | 保费 |
| `is_active` | boolean | 是否启用 |
| `description` | text | 保险说明 |

**订单保险记录表 `order_insurances` / 实体 `OrderInsurance`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `order_id` | number | 关联订单 ID |
| `insurance_id` | number | 保险配置 ID |
| `premium` | decimal(10,2) | 保费金额 |
| `status` | enum | `active` / `claimed` / `expired` |
| `claimed_at` | datetime | 理赔时间 |
| `claim_amount` | decimal(10,2) | 理赔金额 |
| `claim_reason` | text | 理赔原因 |

### 8.4 赔付标准

**赔付规则配置表 `compensation_rules` / 实体 `CompensationRule`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `type` | enum | `delay` / `no_show` / `damage` / `quality` |
| `condition` | string | 触发条件描述 |
| `compensation_type` | enum | `refund_percent` / `fixed_amount` / `coupon` |
| `compensation_value` | decimal(10,2) | 赔付值（百分比或金额） |
| `max_amount` | decimal(10,2) | 上限金额 |
| `is_active` | boolean | 是否启用 |

**赔付标准示例**：

| 场景 | 触发条件 | 赔付方案 |
|-----|---------|---------|
| 师傅迟到 15-30分钟 | 系统记录到达时间 > 预约时间 + 15分钟 | 退还 ¥20 |
| 师傅迟到 30-60分钟 | 系统记录到达时间 > 预约时间 + 30分钟 | 退还 ¥50 |
| 师傅迟到 > 60分钟 | 系统记录到达时间 > 预约时间 + 60分钟 | 全额退款 + ¥30 优惠券 |
| 师傅爽约 | 师傅未到达且未提前 2小时通知 | 全额退款 + 赔偿 ¥50 |
| 物品损坏（轻微） | 客户提供照片证据，损失 ≤ ¥500 | 赔偿实际损失，上限 ¥500 |
| 物品损坏（严重） | 客户提供照片证据，损失 > ¥500 | 赔偿实际损失，上限 ¥2000，启动保险 |
| 服务质量投诉成立 | 客户提交证据，客服核实 | 退还 30%-100% 服务费 |

### 8.5 纠纷仲裁流程

**仲裁流程设计**：

1. **投诉提交**：用户提交投诉，附加证据（照片、聊天记录等）。
2. **自动初判**：系统根据规则自动判定（如迟到记录）。
3. **人工介入**：自动判定失败时，客服介入调查。
4. **证据收集**：
   - 联系双方收集陈述。
   - 调取订单日志、定位记录、聊天记录。
   - 如有必要，请求用户提供更多证据。
5. **责任判定**：客服根据证据做出责任判定。
6. **处理方案**：根据判定结果和赔付标准制定方案。
7. **执行落实**：自动执行退款、赔偿、信用分扣除等。
8. **结果反馈**：通知双方处理结果。
9. **申诉通道**：对处理结果不满意，可在 7 天内申诉。

**投诉处理接口**：

```typescript
// backend/src/complaints/complaints.controller.ts
@Controller('complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  // 提交投诉
  @Post()
  async create(
    @Req() req,
    @Body() createDto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(req.user.id, createDto);
  }

  // 获取我的投诉列表
  @Get()
  async findMyComplaints(@Req() req) {
    return this.complaintsService.findByUser(req.user.id);
  }

  // 管理员：获取所有投诉
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(@Query() query: ComplaintQueryDto) {
    return this.complaintsService.findAll(query);
  }

  // 管理员：受理投诉
  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async acceptComplaint(@Param('id') id: number, @Req() req) {
    return this.complaintsService.accept(id, req.user.id);
  }

  // 管理员：处理投诉
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async resolveComplaint(
    @Param('id') id: number,
    @Body() resolveDto: ResolveComplaintDto,
  ) {
    return this.complaintsService.resolve(id, resolveDto);
  }
}

// backend/src/complaints/complaints.service.ts
@Injectable()
export class ComplaintsService {
  async resolve(id: number, dto: ResolveComplaintDto) {
    const complaint = await this.complaintsRepository.findOne(id, {
      relations: ['order'],
    });

    // 1. 更新投诉状态
    await this.complaintsRepository.update(id, {
      status: ComplaintStatus.RESOLVED,
      result: dto.result,
      compensationAmount: dto.compensationAmount,
      investigatorId: dto.investigatorId,
      resolvedAt: new Date(),
    });

    // 2. 执行赔付
    if (dto.compensationAmount > 0) {
      await this.refundService.createRefundForComplaint(
        complaint.orderId,
        dto.compensationAmount,
        dto.result,
      );
    }

    // 3. 扣除被投诉方信用分
    if (dto.creditScoreDeduction > 0) {
      await this.workerProfilesService.deductCreditScore(
        complaint.respondentId,
        dto.creditScoreDeduction,
        `投诉处理：${dto.result}`,
      );
    }

    // 4. 发送通知
    await this.notificationsService.send(
      complaint.complainantId,
      '投诉处理结果',
      `您的投诉已处理：${dto.result}`,
    );

    // 5. 更新订单投诉状态
    await this.ordersRepository.update(complaint.orderId, {
      hasComplaint: true,
    });

    return { success: true };
  }
}
```

### 8.6 退款政策详情

**退款政策表 `refund_policies` / 实体 `RefundPolicy`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `name` | string | 政策名称 |
| `service_category_id` | number | 适用服务分类（可空表示通用） |
| `cancel_before_hours` | number | 取消时间（小时） |
| `refund_percent` | decimal(5,2) | 退款比例 |
| `description` | string | 政策说明 |
| `is_active` | boolean | 是否启用 |

**退款政策示例**：

| 服务类型 | 取消时间 | 退款比例 | 违约金 |
|---------|---------|---------|-------|
| 通用 | > 24小时 | 100% | 无 |
| 通用 | 2-24小时 | 80% | 20% |
| 通用 | < 2小时 | 50% | 50% |
| 保洁 | > 12小时 | 100% | 无 |
| 保洁 | 4-12小时 | 90% | 10% |
| 保洁 | < 4小时 | 50% | 50% |
| 搬家 | > 48小时 | 100% | 无 |
| 搬家 | 24-48小时 | 80% | 20% |
| 搬家 | < 24小时 | 30% | 70% |

### 8.7 师傅处罚机制

**师傅处罚记录表 `worker_penalties` / 实体 `WorkerPenalty`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `worker_id` | number | 师傅用户 ID |
| `order_id` | number | 关联订单 ID |
| `type` | enum | `warning` / `freeze` / `ban` |
| `reason` | string | 处罚原因 |
| `deduct_credit_score` | number | 扣除信用分 |
| `suspend_days` | number | 禁单天数（冻结时） |
| `expired_at` | datetime | 处罚到期时间（冻结时） |
| `admin_id` | number | 操作管理员 ID |
| `created_at` | datetime | 创建时间 |

**处罚规则**：

| 行为 | 处罚措施 | 说明 |
|-----|---------|------|
| 首次迟到 15-30分钟 | 警告 | 信用分 -2 |
| 迟到 30-60分钟 | 警告 | 信用分 -5 |
| 迟到 > 60分钟 | 冻结 3 天 | 信用分 -10 |
| 爽约一次 | 冻结 7 天 | 信用分 -15 |
| 爽约两次 | 冻结 30 天 | 信用分 -30 |
| 爽约三次 | 永久封禁 | 信用分 -50 |
| 差评率 > 20%（月） | 警告 | 要求培训 |
| 差评率 > 30%（月） | 冻结 14 天 | 强制培训 |
| 投诉成立（严重） | 冻结 14 天 | 信用分 -20 |
| 投诉成立（极严重） | 永久封禁 | 信用分 -50 |

### 8.8 纠纷与保障体系接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/complaints` | POST | 提交投诉 | 用户 |
| `/complaints` | GET | 我的投诉列表 | 用户 |
| `/complaints/:id` | GET | 投诉详情 | 用户/管理员 |
| `/complaints/admin/all` | GET | 所有投诉列表 | 管理员 |
| `/complaints/:id/accept` | PATCH | 受理投诉 | 管理员 |
| `/complaints/:id/resolve` | PATCH | 处理投诉 | 管理员 |
| `/complaints/:id/appeal` | POST | 申诉 | 用户 |
| `/insurance/orders/:orderId` | GET | 订单保险信息 | 用户/管理员 |
| `/compensation/rules` | GET | 赔付标准列表 | 用户 |
| `/refund/policies` | GET | 退款政策列表 | 用户 |
| `/worker/penalties` | GET | 处罚记录 | 师傅 |
| `/worker/credit/score` | GET | 信用分详情 | 师傅 |

---

## 九、管理后台详细功能

### 9.1 仪表盘与数据概览

管理后台首页应展示平台核心运营指标：

**仪表盘接口 `GET /admin/dashboard`**：

```typescript
// backend/src/admin/admin.controller.ts
@Get('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getDashboard() {
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  return {
    // 今日数据
    todayOrders: await this.ordersService.countTodayOrders(),
    todayRevenue: await this.ordersService.sumTodayRevenue(),
    todayCompletedOrders: await this.ordersService.countTodayCompleted(),
    todayNewUsers: await this.usersService.countTodayNew(),

    // 师傅数据
    totalWorkers: await this.usersService.countByRole('worker'),
    activeWorkers: await this.workerProfilesService.countActive(),
    pendingAuditWorkers: await this.workerProfilesService.countPendingAudit(),

    // 客户数据
    totalCustomers: await this.usersService.countByRole('customer'),
    todayNewCustomers: await this.usersService.countTodayNewByRole('customer'),

    // 订单数据
    pendingOrders: await this.ordersService.countByStatus(OrderStatus.PENDING),
    inProgressOrders: await this.ordersService.countInProgress(),
    completedOrdersThisMonth: await this.ordersService.countCompletedThisMonth(),
    cancelledOrdersThisMonth: await this.ordersService.countCancelledThisMonth(),

    // 投诉数据
    pendingComplaints: await this.complaintsService.countByStatus(ComplaintStatus.PENDING),
    resolvedComplaintsThisMonth: await this.complaintsService.countResolvedThisMonth(),

    // 收入统计
    monthlyRevenue: await this.transactionsService.sumMonthlyRevenue(),
    monthlyWithdrawals: await this.withdrawalsService.sumMonthlyAmount(),

    // 环比数据
    yesterdayOrders: await this.ordersService.countYesterdayOrders(),
    yesterdayRevenue: await this.ordersService.sumYesterdayRevenue(),
  };
}
```

**仪表盘展示内容**：

| 模块 | 指标 | 说明 |
|-----|------|------|
| 核心数据 | 今日订单数、今日收入、完单数、新增用户 | 实时数据概览 |
| 订单趋势 | 近7天订单数量折线图 | 订单增长趋势 |
| 收入趋势 | 近7天收入折线图 | 收入增长趋势 |
| 师傅排行 | 接单数、好评率、收入 TOP10 | 优秀师傅展示 |
| 待处理 | 待审核师傅、待处理投诉、待审核提现 | 运营待办 |
| 服务分布 | 各服务类型订单占比 | 服务偏好分析 |

### 9.2 师傅管理

**师傅列表与审核**：

```typescript
// backend/src/admin/admin.controller.ts
// 获取师傅列表
@Get('workers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWorkers(@Query() query: WorkerQueryDto) {
  return this.adminService.getWorkers(query);
}

// 审核师傅
@Post('workers/:id/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async auditWorker(
  @Param('id') id: number,
  @Body() dto: AuditWorkerDto,
) {
  return this.adminService.auditWorker(id, dto);
}

// 获取师傅详情
@Get('workers/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWorkerDetail(@Param('id') id: number) {
  return this.adminService.getWorkerDetail(id);
}

// 查看师傅收入明细
@Get('workers/:id/income')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWorkerIncomeDetail(@Param('id') id: number) {
  return this.adminService.getWorkerIncomeDetail(id);
}

// 查看师傅处罚记录
@Get('workers/:id/penalties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWorkerPenalties(@Param('id') id: number) {
  return this.adminService.getWorkerPenalties(id);
}

// 对师傅进行处罚
@Post('workers/:id/penalize')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async penalizeWorker(
  @Param('id') id: number,
  @Body() dto: PenalizeWorkerDto,
) {
  return this.adminService.penalizeWorker(id, dto);
}
```

**师傅管理页面功能**：

| 功能 | 说明 |
|-----|------|
| 列表筛选 | 按状态、注册时间、服务类型、评分、信用分筛选 |
| 详情查看 | 基本信息、认证资料、服务记录、收入明细、处罚记录 |
| 审核操作 | 通过/拒绝/退回修改 |
| 状态管理 | 启用/禁用/冻结/封禁 |
| 信用分调整 | 手动调整信用分 |
| 等级调整 | 手动调整等级 |

### 9.3 订单管理

```typescript
// 获取订单列表
@Get('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getOrders(@Query() query: OrderQueryDto) {
  return this.adminService.getOrders(query);
}

// 获取订单详情
@Get('orders/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getOrderDetail(@Param('id') id: number) {
  return this.adminService.getOrderDetail(id);
}

// 取消订单（管理员）
@Post('orders/:id/cancel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async cancelOrder(
  @Param('id') id: number,
  @Body() dto: CancelOrderDto,
) {
  return this.adminService.cancelOrder(id, dto);
}

// 手动退款
@Post('orders/:id/refund')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async refundOrder(
  @Param('id') id: number,
  @Body() dto: RefundOrderDto,
) {
  return this.adminService.refundOrder(id, dto);
}

// 查看订单轨迹
@Get('orders/:id/track')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getOrderTrack(@Param('id') id: number) {
  return this.adminService.getOrderTrack(id);
}
```

**订单管理页面功能**：

| 功能 | 说明 |
|-----|------|
| 列表筛选 | 按状态、时间、用户、师傅、服务类型筛选 |
| 详情查看 | 订单信息、客户信息、师傅信息、服务明细、支付信息 |
| 轨迹追踪 | 展示订单完整轨迹（地图） |
| 订单操作 | 查看、取消、退款、投诉处理 |
| 导出功能 | 导出订单报表 |

### 9.4 财务管理

```typescript
// 获取交易流水
@Get('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getTransactions(@Query() query: TransactionQueryDto) {
  return this.adminService.getTransactions(query);
}

// 获取提现列表
@Get('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWithdrawals(@Query() query: WithdrawalQueryDto) {
  return this.adminService.getWithdrawals(query);
}

// 审核提现
@Patch('withdrawals/:id/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async auditWithdrawal(
  @Param('id') id: number,
  @Body() dto: AuditWithdrawalDto,
) {
  return this.adminService.auditWithdrawal(id, dto);
}

// 财务统计报表
@Get('finance/report')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getFinanceReport(@Query() query: DateRangeQueryDto) {
  return this.adminService.getFinanceReport(query);
}

// 师傅收入排行榜
@Get('finance/worker-rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWorkerRankings(@Query() query: RankingQueryDto) {
  return this.adminService.getWorkerRankings(query);
}
```

**财务管理页面功能**：

| 功能 | 说明 |
|-----|------|
| 交易流水 | 按类型、时间、用户筛选，支持导出 |
| 提现审核 | 待审核/已审核列表，支持通过/拒绝 |
| 财务统计 | 日/周/月报，收入支出统计 |
| 对账功能 | 与支付平台对账 |
| 师傅结算 | 结算明细查看 |

### 9.5 客服管理

```typescript
// 获取工单列表
@Get('support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getTickets(@Query() query: TicketQueryDto) {
  return this.adminService.getTickets(query);
}

// 获取工单详情
@Get('support/tickets/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getTicketDetail(@Param('id') id: number) {
  return this.adminService.getTicketDetail(id);
}

// 回复工单
@Post('support/tickets/:id/reply')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async replyTicket(
  @Param('id') id: number,
  @Body() dto: ReplyTicketDto,
) {
  return this.adminService.replyTicket(id, dto);
}

// 获取投诉列表
@Get('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getComplaints(@Query() query: ComplaintQueryDto) {
  return this.adminService.getComplaints(query);
}

// 处理投诉
@Patch('complaints/:id/resolve')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async resolveComplaint(
  @Param('id') id: number,
  @Body() dto: ResolveComplaintDto,
) {
  return this.adminService.resolveComplaint(id, dto);
}

// 客服统计
@Get('support/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getSupportStats(@Query() query: DateRangeQueryDto) {
  return this.adminService.getSupportStats(query);
}
```

**客服管理页面功能**：

| 功能 | 说明 |
|-----|------|
| 工单列表 | 按状态、时间、类型筛选 |
| 工单详情 | 对话记录、客户信息、订单信息 |
| 回复操作 | 快捷回复模板、自定义回复 |
| 投诉处理 | 证据查看、责任判定、赔付执行 |
| 统计报表 | 工单量、响应时长、满意度统计 |
| 知识库 | FAQ 管理、快捷回复设置 |

### 9.6 系统配置

```typescript
// 获取配置列表
@Get('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getConfigs() {
  return this.adminService.getConfigs();
}

// 更新配置
@Patch('config/:key')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateConfig(
  @Param('key') key: string,
  @Body() dto: UpdateConfigDto,
) {
  return this.adminService.updateConfig(key, dto);
}

// 服务分类管理
@Get('service-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getServiceCategories(@Query() query) {
  return this.adminService.getServiceCategories(query);
}

@Post('service-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async createServiceCategory(@Body() dto: CreateCategoryDto) {
  return this.adminService.createServiceCategory(dto);
}

@Patch('service-categories/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateServiceCategory(
  @Param('id') id: number,
  @Body() dto: UpdateCategoryDto,
) {
  return this.adminService.updateServiceCategory(id, dto);
}

// Banner 管理
@Get('banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getBanners(@Query() query) {
  return this.adminService.getBanners(query);
}

@Post('banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async createBanner(@Body() dto: CreateBannerDto) {
  return this.adminService.createBanner(dto);
}

@Patch('banners/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateBanner(
  @Param('id') id: number,
  @Body() dto: UpdateBannerDto,
) {
  return this.adminService.updateBanner(id, dto);
}

@Delete('banners/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async deleteBanner(@Param('id') id: number) {
  return this.adminService.deleteBanner(id);
}
```

**系统配置项**：

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| `commission_rate` | 平台佣金比例 | 0.10 |
| `max_daily_orders` | 师傅每日接单上限 | 10 |
| `max_service_radius` | 师傅最大服务半径（km） | 50 |
| `order_cancel_limit_hours` | 订单取消时限（小时） | 2 |
| `withdrawal_min_amount` | 最低提现金额 | 100 |
| `withdrawal_fee_rate` | 提现手续费比例 | 0.01 |
| `worker_level_bronze_count` | 铜牌师傅所需订单数 | 10 |
| `worker_level_silver_count` | 银牌师傅所需订单数 | 50 |
| `worker_level_gold_count` | 金牌师傅所需订单数 | 200 |
| `worker_level_diamond_count` | 钻石师傅所需订单数 | 500 |
| `credit_score_threshold` | 信用分接单门槛 | 60 |

### 9.7 管理后台接口汇总

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/admin/dashboard` | GET | 仪表盘数据 | 管理员 |
| `/admin/workers` | GET | 师傅列表 | 管理员 |
| `/admin/workers/:id` | GET | 师傅详情 | 管理员 |
| `/admin/workers/:id/audit` | POST | 审核师傅 | 管理员 |
| `/admin/workers/:id/penalize` | POST | 处罚师傅 | 管理员 |
| `/admin/orders` | GET | 订单列表 | 管理员 |
| `/admin/orders/:id` | GET | 订单详情 | 管理员 |
| `/admin/orders/:id/cancel` | POST | 取消订单 | 管理员 |
| `/admin/orders/:id/refund` | POST | 手动退款 | 管理员 |
| `/admin/transactions` | GET | 交易流水 | 管理员 |
| `/admin/withdrawals` | GET | 提现列表 | 管理员 |
| `/admin/withdrawals/:id/audit` | PATCH | 审核提现 | 管理员 |
| `/admin/finance/report` | GET | 财务报表 | 管理员 |
| `/admin/support/tickets` | GET | 工单列表 | 管理员 |
| `/admin/support/tickets/:id` | GET | 工单详情 | 管理员 |
| `/admin/support/tickets/:id/reply` | POST | 回复工单 | 管理员 |
| `/admin/complaints` | GET | 投诉列表 | 管理员 |
| `/admin/complaints/:id/resolve` | PATCH | 处理投诉 | 管理员 |
| `/admin/config` | GET/PATCH | 系统配置 | 管理员 |
| `/admin/service-categories` | CRUD | 服务分类管理 | 管理员 |
| `/admin/banners` | CRUD | Banner 管理 | 管理员 |

---

## 十、部署运维规范

### 10.1 Docker 部署

**Dockerfile（后端）**：

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**Dockerfile（前端）**：

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf（前端配置）**：

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://backend:3000;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

**docker-compose.yml**：

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASS=${DB_PASSWORD}
      - DB_NAME=family_home_service
      - JWT_SECRET=${JWT_SECRET}
      - ALIPAY_APP_ID=${ALIPAY_APP_ID}
      - ALIPAY_PRIVATE_KEY=${ALIPAY_PRIVATE_KEY}
      - ALIPAY_PUBLIC_KEY=${ALIPAY_PUBLIC_KEY}
      - WECHAT_APPID=${WECHAT_APPID}
      - WECHAT_MCH_ID=${WECHAT_MCH_ID}
      - WECHAT_API_V3_KEY=${WECHAT_API_V3_KEY}
      - WECHAT_PRIVATE_KEY=${WECHAT_PRIVATE_KEY}
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - mysql
      - redis
    networks:
      - app-network

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=family_home_service
    volumes:
      - mysql-data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network

volumes:
  mysql-data:
  redis-data:
  uploads:
  logs:

networks:
  app-network:
    driver: bridge
```

### 10.2 环境变量管理

**环境配置文件结构**：

```
.env                # 本地开发默认配置
.env.development    # 开发环境覆盖
.env.staging        # 预发布环境
.env.production     # 生产环境
```

**.env.production 示例**：

```bash
# 数据库
DB_HOST=10.0.0.10
DB_PORT=3306
DB_USER=app_user
DB_PASS=your_secure_password
DB_NAME=family_home_service

# Redis
REDIS_HOST=10.0.0.11
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars

# 支付宝
ALIPAY_APP_ID=2021000000000000
ALIPAY_PRIVATE_KEY="MIIE..."
ALIPAY_PUBLIC_KEY="MIIBIjAN..."
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://api.yourdomain.com/payment/alipay/notify

# 微信支付
WECHAT_APPID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_SERIAL_NO=CERT_SERIAL_NO
WECHAT_API_V3_KEY=your_api_v3_key
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
WECHAT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
WECHAT_NOTIFY_URL=https://api.yourdomain.com/payment/wechat/notify
WECHAT_REFUND_NOTIFY_URL=https://api.yourdomain.com/payment/wechat/refund-notify

# WebSocket
WS_PORT=3000
FRONTEND_ORIGIN=https://yourdomain.com

# 日志
LOG_LEVEL=info

# 其他
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 10.3 数据库迁移

**使用 TypeORM Migration**：

```bash
# 创建迁移文件
npm run migration:generate -- -n AddWorkerLevels

# 查看待执行迁移
npm run migration:show

# 执行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

**迁移文件示例**：

```typescript
// backend/src/migrations/1710000000000-AddWorkerLevels.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerLevels1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE worker_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level INT NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        min_service_count INT NOT NULL DEFAULT 0,
        min_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
        commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15,
        benefits JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 插入默认等级数据
    await queryRunner.query(`
      INSERT INTO worker_levels (level, name, min_service_count, min_rating, commission_rate, benefits) VALUES
      (1, '新手', 0, 0, 0.15, '{"priority": false, "badge": false}'),
      (2, '铜牌', 10, 4.50, 0.12, '{"priority": false, "badge": true}'),
      (3, '银牌', 50, 4.70, 0.10, '{"priority": true, "badge": true}'),
      (4, '金牌', 200, 4.80, 0.08, '{"priority": true, "badge": true}'),
      (5, '钻石', 500, 4.90, 0.05, '{"priority": true, "badge": true}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE worker_levels`);
  }
}
```

### 10.4 备份与恢复

**数据库备份脚本**：

```bash
#!/bin/bash
# backup.sh

# 配置
BACKUP_DIR="/data/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASS="your_password"
DB_NAME="family_home_service"
KEEP_DAYS=7

# 创建备份目录
mkdir -p ${BACKUP_DIR}

# 执行备份
mysqldump -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} \
  --single-transaction --routines --triggers \
  ${DB_NAME} | gzip > ${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz

# 删除旧备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${KEEP_DAYS} -delete

# 上传到对象存储（可选）
# aws s3 cp ${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz s3://your-backup-bucket/

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

**文件备份（uploads 目录）**：

```bash
#!/bin/bash
# backup_uploads.sh

BACKUP_DIR="/data/backup/uploads"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_DIR="/app/uploads"

mkdir -p ${BACKUP_DIR}
tar -czf ${BACKUP_DIR}/uploads_${DATE}.tar.gz -C $(dirname ${SOURCE_DIR}) $(basename ${SOURCE_DIR})

# 清理旧备份
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete

echo "Uploads backup completed"
```

**恢复脚本**：

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file.sql.gz>"
  exit 1
fi

gunzip -c ${BACKUP_FILE} | mysql -hlocalhost -uroot -pyour_password family_home_service

echo "Restore completed"
```

### 10.5 监控与告警

**健康检查接口**：

```typescript
// backend/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private dataSource: DataSource,
    private redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      mysql: 'unknown',
      redis: 'unknown',
    };

    // 检查 MySQL
    try {
      await this.dataSource.query('SELECT 1');
      checks.mysql = 'ok';
    } catch (error) {
      checks.mysql = 'error';
    }

    // 检查 Redis
    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = 'error';
    }

    // 如果任一检查失败，返回 503
    if (checks.mysql === 'error' || checks.redis === 'error') {
      return res.status(503).json(checks);
    }

    return checks;
  }

  @Get('ready')
  async readiness() {
    // 检查就绪状态，用于 K8s readinessProbe
    const isReady = await this.checkDependencies();
    if (!isReady) {
      throw new ServiceUnavailableException('Service not ready');
    }
    return { ready: true };
  }

  @Get('live')
  async liveness() {
    // 检查存活状态，用于 K8s livenessProbe
    return { alive: true };
  }
}
```

**Prometheus 指标**（需要安装 `prom-client`）：

```typescript
// backend/src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private registry: Registry;
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private ordersTotal: Counter;
  private ordersDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.ordersTotal = new Counter({
      name: 'orders_total',
      help: 'Total orders',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.ordersDuration = new Histogram({
      name: 'order_processing_duration_seconds',
      help: 'Order processing duration',
      labelNames: ['type'],
      buckets: [60, 300, 600, 1800, 3600],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status });
    this.httpRequestDuration.observe({ method, route }, duration / 1000);
  }

  recordOrder(status: string) {
    this.ordersTotal.inc({ status });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### 10.6 日志规范

**日志格式标准**（使用 `nestjs/pino`）：

```typescript
// backend/src/main.ts
import { Logger } from 'nestjs/pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useLogger(
    app.get(Logger),
  );

  // 启用请求日志中间件
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      app.get(Logger).log({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });
    });
    next();
  });
}
```

**日志级别使用规范**：

| 级别 | 使用场景 | 示例 |
|-----|---------|------|
| `error` | 错误和异常 | 数据库连接失败、支付回调验签失败 |
| `warn` | 警告信息 | 请求参数校验失败、权限不足 |
| `log` | 关键操作日志 | 用户登录、订单创建、支付成功 |
| `debug` | 调试信息 | 请求参数详情、SQL 语句 |
| `verbose` | 详细追踪 | 业务流程步骤追踪 |

**结构化日志字段**：

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "订单创建成功",
  "orderId": 12345,
  "userId": 678,
  "amount": 150.00,
  "serviceType": "日常保洁",
  "traceId": "abc123def456",
  "environment": "production"
}
```

### 10.7 部署检查清单

**上线前检查**：

| 检查项 | 说明 | 状态 |
|-------|------|------|
| 环境变量 | 所有生产环境变量已配置 | ☐ |
| 数据库迁移 | 迁移文件已执行，无报错 | ☐ |
| 静态资源 | 前端构建产物已生成 | ☐ |
| 端口开放 | 80/443/3000 端口已开放 | ☐ |
| 域名解析 | 域名已解析到服务器 | ☐ |
| SSL 证书 | HTTPS 证书已配置 | ☐ |
| 日志目录 | logs 目录已创建，权限正确 | ☐ |
| 上传目录 | uploads 目录已创建，权限正确 | ☐ |
| 备份策略 | 自动备份已配置 | ☐ |
| 监控告警 | 监控指标已配置，告警已设置 | ☐ |
| 支付配置 | 支付宝/微信支付沙箱已测试 | ☐ |
| 支付配置 | 支付宝/微信支付生产环境已配置 | ☐ |
| 第三方密钥 | 所有密钥已通过环境变量配置 | ☐ |
| Redis 配置 | Redis 密码已设置，连接正常 | ☐ |
| 安全组 | 仅开放必要端口 | ☐ |

---

## 十一、技术规范与安全

### 11.1 代码规范

**ESLint 配置（后端）**：

```javascript
// backend/.eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
};
```

**ESLint 配置（前端）**：

```javascript
// frontend/.eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/typescript/recommended',
    'prettier',
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
};
```

### 11.2 Git 提交规范

**Commit Message 格式**：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

| 类型 | 说明 |
|-----|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既不是新功能也不是 Bug 修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建工具或辅助工具的变动 |

**提交示例**：

```
feat(orders): 新增师傅抢单分布式锁

- 使用 Redis 实现分布式锁防止并发抢单
- 锁超时时间设置为 5 秒
- 抢单失败返回 409 状态码

Closes #123
```

**Git Hooks（使用 husky）**：

```bash
# 安装 husky
npm install -D husky

# 初始化
npx husky install

# 添加 pre-commit 钩子
npx husky add .husky/pre-commit "npm run lint"

# 添加 commit-msg 钩子
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
```

### 11.3 API 设计规范

**统一响应格式**：

```typescript
// backend/src/common/dto/response.dto.ts
export class ResponseDto<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  timestamp: string;
  traceId?: string;

  static ok<T>(data?: T, message = 'success'): ResponseDto<T> {
    return {
      success: true,
      code: 200,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static fail(message: string, code = 400): ResponseDto<void> {
    return {
      success: false,
      code,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
```

**错误码规范**：

| 错误码范围 | 说明 |
|-----------|------|
| 400-499 | 客户端错误 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 业务校验失败 |
| 429 | 请求过于频繁 |
| 500-599 | 服务端错误 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

### 11.4 数据库设计规范

**表命名规范**：

- 使用小写字母和下划线（snake_case）
- 表名使用复数形式（`users`、`orders`、`transactions`）
- 关联表使用双主键表名（`order_items` 而不是 `order_order_items`）
- 避免使用保留字

**字段命名规范**：

- 使用小写字母和下划线（snake_case）
- 主键统一使用 `id`
- 创建时间统一使用 `created_at`
- 更新时间统一使用 `updated_at`
- 软删除字段统一使用 `deleted_at`
- 外键统一使用 `{table_name}_id` 格式

**索引设计原则**：

- 主键索引：自动创建
- 唯一索引：业务唯一性约束的字段
- 普通索引：经常用于查询条件的字段
- 复合索引：经常一起查询的字段组（左前缀原则）

**索引示例**：

```sql
-- 订单表索引
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_worker_id ON orders(worker_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_service_time ON orders(service_time);

-- 复合索引：师傅端常用查询
CREATE INDEX idx_orders_worker_status ON orders(worker_id, status);

-- 复合索引：订单列表常用查询
CREATE INDEX idx_orders_customer_status_created ON orders(customer_id, status, created_at DESC);
```

### 11.5 敏感数据处理

**需要脱敏的字段**：

| 字段 | 脱敏方式 | 示例 |
|-----|---------|------|
| `phone` | 中间4位隐藏 | 138****1234 |
| `id_card_no` | 前3后4位保留 | 110***********1234 |
| `bank_card_no` | 前6后4位保留 | 622202****1234 |
| `password` | 绝对不能返回 | - |
| `api_key` | 不能返回 | - |

**脱敏示例**：

```typescript
// backend/src/common/utils/mask.util.ts
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 15) return idCard;
  return idCard.replace(/(\d{3})\d{10}(\d{4})/, '$1**********$2');
}

export function maskBankCard(cardNo: string): string {
  if (!cardNo || cardNo.length < 10) return cardNo;
  return cardNo.replace(/(\d{6})\d*(\d{4})/, '$1****$2');
}
```

**敏感数据存储**：

```typescript
// 身份证号加密存储示例
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.DATA_ENCRYPTION_KEY;  // 32位密钥

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 11.6 安全防护措施

**SQL 注入防护**：

- 使用 TypeORM 参数化查询
- 禁止拼接 SQL 字符串
- 对用户输入进行验证和过滤

**XSS 防护**：

```typescript
// 安装 xss
npm install xss

// 使用示例
import * as xss from 'xss';

@Injectable()
export class XssService {
  sanitize(html: string): string {
    return xss(html, {
      whiteList: {},  // 不允许任何标签
      stripIgnoreTag: true,
    });
  }
}
```

**CSRF 防护**（如果使用 Cookie 存储 Token）：

```typescript
// backend/src/common/guards/csrf.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-csrf-token'];
    
    if (!token) {
      return false;
    }
    
    // 验证 CSRF Token
    return token === request.cookies['csrf_token'];
  }
}
```

**请求频率限制**：

```typescript
// 安装
npm install @nestjs/throttler

// backend/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1分钟
      limit: 100,  // 最多100次请求
    }]),
  ],
})
export class AppModule {}
```

### 11.7 测试要求

**单元测试覆盖率要求**：

| 模块 | 最低覆盖率 |
|-----|----------|
| Service 层 | 80% |
| Controller 层 | 60% |
| 整体项目 | 70% |

**测试示例**：

```typescript
// backend/src/orders/orders.service.spec.ts
describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repository = module.get(getRepositoryToken(Order));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('grabOrder', () => {
    it('should throw error if order not found', async () => {
      repository.findOne.mockResolvedValue(null);
      
      await expect(service.grabOrder(1, mockWorker))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error if order already grabbed', async () => {
      repository.findOne.mockResolvedValue({ 
        id: 1, 
        status: OrderStatus.GRABBED 
      } as Order);
      
      await expect(service.grabOrder(1, mockWorker))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully grab order', async () => {
      repository.findOne.mockResolvedValue({ 
        id: 1, 
        status: OrderStatus.PENDING 
      } as Order);
      repository.update.mockResolvedValue({ affected: 1 } as UpdateResult);
      
      const result = await service.grabOrder(1, mockWorker);
      
      expect(result.success).toBe(true);
      expect(repository.update).toHaveBeenCalled();
    });
  });
});
```

### 11.8 技术规范检查清单

| 规范项 | 要求 | 检查 |
|-------|------|------|
| TypeScript | 严格模式 `strict: true` | ☐ |
| ESLint | 无 error 级别错误 | ☐ |
| Prettier | 代码格式统一 | ☐ |
| Git Commit | 符合规范 | ☐ |
| 接口文档 | OpenAPI/Swagger | ☐ |
| 单元测试 | 覆盖率达标 | ☐ |
| 敏感信息 | 不硬编码 | ☐ |
| 环境变量 | 敏感信息不提交 | ☐ |
| 日志 | 关键操作有日志 | ☐ |
| 错误处理 | 有全局异常处理 | ☐ |
| 脱敏 | 敏感数据返回脱敏 | ☐ |
| 频率限制 | 核心接口有限制 | ☐ |

---

## 十二、版本演进路线（可选参考）

### v1.0 核心功能

- [x] 用户注册登录（手机号）
- [x] 服务分类浏览
- [x] 订单发布与支付
- [x] 师傅接单服务
- [x] 基础评价体系
- [x] 钱包与提现
- [x] 聊天功能
- [x] 客服工单

### v2.0 增强功能

- [ ] 会员体系（等级、积分）
- [ ] 优惠券中心（满减、折扣、新人券）
- [ ] 师傅等级与佣金差异化
- [ ] 智能派单推荐
- [ ] 数据报表
- [ ] 消息推送（短信、APP Push）
- [ ] 师傅培训体系

### v3.0 生态扩展

- [ ] 多服务商入驻
- [ ] 商家入驻后台
- [ ] 开放 API
- [ ] 加盟商体系
- [ ] 跨城市扩展
- [ ] 企业客户端
- [ ] 服务保险接入

---

## 十三、使用本 Skill 时的思考顺序（更新版）

1. **判断需求归属的业务域**
   - 用户的改动/问题是关于：登录注册、服务分类、订单发布与抢单、地址、钱包与提现、优惠券、评价、聊天、工单、文件上传、支付结算、实时通讯、师傅管理、纠纷处理、管理后台，还是部署运维？

2. **在后端模块中定位入口**
   - 在 `backend/src` 中优先查找对应 Module、Controller、Service 和 Entity
   - 支付相关：`payment/` 目录
   - 实时通讯：`events/` 目录
   - 投诉纠纷：`complaints/` 目录
   - 管理后台：`admin/` 目录

3. **同步前端、后台管理与数据库层面的改动**
   - 确保字段名、枚举值、状态含义在前后端一致
   - 涉及数据库变更需考虑 Migration

4. **注意角色与权限、金额与状态的一致性**
   - 尤其是涉及身份校验（customer/worker/admin）
   - 状态机变更、金额结算、支付安全
   - WebSocket 房间权限

5. **考虑扩展性与性能**
   - 高频接口是否需要缓存
   - 并发场景是否有分布式锁
   - 消息推送是否需要队列

---

本 Skill 已更新至 2024 年 1 月版本，包含支付结算、实时通讯、师傅端工作流、纠纷保障、管理后台、部署运维、技术规范等扩展章节。建议在使用前先通读相关章节，建立整体认知，开发时再查阅具体实现细节。

---

## 十四、会员体系与积分

### 14.1 会员等级设计

会员体系是提升用户留存和活跃度的核心功能，通过消费累积和等级权益激励用户持续使用平台。会员等级体系采用阶梯式设计，用户达到一定消费金额即可升级，享受对应等级的专属权益。等级体系包括普通会员、银牌会员、金牌会员、钻石会员四个层级，每个等级对应不同的消费门槛和权益配置。等级权益包括折扣优惠、专属客服、优先派单、上门补贴等，能够有效区分普通用户与高价值用户，提供差异化的服务体验。

**会员等级表 `member_levels` / 实体 `MemberLevel`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `level` | number | 等级序号（1=普通, 2=银牌, 3=金牌, 4=钻石） |
| `name` | string | 等级名称 |
| `min_amount` | decimal(12,2) | 累计消费门槛 |
| `discount_rate` | decimal(5,4) | 折扣比例（如 0.95 表示 95 折） |
| `points_bonus` | decimal(5,4) | 积分加成比例 |
| `priority_order` | boolean | 是否优先派单 |
| `dedicated_service` | boolean | 是否专属客服 |
| `home_visit_subsidy` | decimal(10,2) | 上门补贴金额 |
| `description` | string | 等级权益描述 |
| `icon` | string | 等级图标 |
| `is_active` | boolean | 是否启用 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

**会员权益配置示例**：

| 等级 | 名称 | 累计消费 | 折扣 | 积分加成 | 优先派单 | 专属客服 | 上门补贴 |
|-----|------|---------|------|---------|---------|---------|---------|
| 1 | 普通会员 | ¥0 | 无 | 1x | 否 | 否 | ¥0 |
| 2 | 银牌会员 | ¥500 | 9.5折 | 1.2x | 否 | 是 | ¥5 |
| 3 | 金牌会员 | ¥2000 | 9折 | 1.5x | 是 | 是 | ¥10 |
| 4 | 钻石会员 | ¥5000 | 8.5折 | 2x | 是 | 是 | ¥20 |

**会员信息表 `members` / 实体 `Member`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 关联用户 ID |
| `level_id` | number | 当前等级 ID |
| `total_consume` | decimal(12,2) | 累计消费金额 |
| `current_points` | number | 当前积分 |
| `total_points` | number | 累计获得积分 |
| `lifetime_value` | decimal(12,2) | 用户生命周期价值 |
| `member_since` | datetime | 成为会员时间 |
| `last_upgraded_at` | datetime | 最后升级时间 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

### 14.2 积分获取规则

积分是会员体系的核心激励手段，用户通过完成特定行为获取积分，积分可用于抵扣订单金额或兑换商品。积分获取规则设计需要平衡激励效果与成本控制，确保积分体系既能有效提升用户活跃度，又不会给平台造成过大的财务负担。积分获取渠道包括消费返积分、评价奖励、签到奖励、邀请奖励、完善信息等多种方式，不同渠道设置不同的积分数量，既保证积分的稀缺性，又提供足够的激励效果。积分具有时效性，可以设置有效期以促进用户持续活跃，避免积分长期囤积带来的财务风险。

**积分获取规则表 `points_rules` / 实体 `PointsRule`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `action` | string | 行为标识（如 order_complete、review、invite） |
| `name` | string | 行为名称 |
| `points` | number | 基础积分 |
| `daily_limit` | number | 每日上限（0 表示无限制） |
| `once_limit` | number | 单次上限（0 表示无限制） |
| `order_threshold` | decimal(10,2) | 消费门槛（消费类行为） |
| `min_amount` | number | 最小积分 |
| `max_amount` | number | 最大积分 |
| `is_active` | boolean | 是否启用 |
| `description` | string | 规则说明 |

**积分获取行为配置示例**：

| 行为标识 | 行为名称 | 基础积分 | 每日上限 | 说明 |
|---------|---------|---------|---------|------|
| `order_complete` | 完成订单 | 订单金额×1 | 无 | 消费越多积分越多 |
| `review` | 评价订单 | +20 | 5次 | 优质评价 |
| `review_with_photo` | 图文评价 | +50 | 3次 | 带图评价额外奖励 |
| `signup` | 完善信息 | +50 | 1次 | 注册后完善个人信息 |
| `bind_phone` | 绑定手机号 | +20 | 1次 | 绑定手机号 |
| `invite_register` | 邀请注册 | +30 | 无 | 邀请新用户注册 |
| `invite_order` | 邀请首单 | +100 | 无 | 被邀请人首单完成后 |
| `checkin` | 每日签到 | +5~10 | 1次 | 连续签到加成 |
| `share_order` | 分享订单 | +10 | 3次 | 分享订单到社交平台 |
| `perfect_profile` | 完善资料 | +50 | 1次 | 完善头像、昵称等 |

**积分流水表 `points_records` / 实体 `PointsRecord`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 用户 ID |
| `action` | string | 行为标识 |
| `points` | number | 积分变化（正数为获得，负数为消耗） |
| `balance_after` | number | 变化后积分余额 |
| `source_type` | enum | 来源类型（order、reward、exchange、expire） |
| `source_id` | number | 来源 ID（订单 ID 等） |
| `description` | string | 描述 |
| `expired_at` | datetime | 积分过期时间 |
| `created_at` | datetime | 创建时间 |

### 14.3 积分使用规则

积分的使用是积分体系的关键环节，合理设计积分使用规则能够有效促进用户消费和活跃。积分使用场景主要包括订单抵扣、积分商城兑换、积分抽奖活动等。订单抵扣是最常见的积分使用方式，积分可按固定比例抵扣订单金额（如 100 积分 = ¥1），同时设置抵扣上限（如最高抵扣订单金额的 20%）以控制成本。积分商城提供丰富的兑换商品，包括优惠券、服务券、实物礼品等，兑换规则需要设置积分价格和库存限制。积分抽奖活动以较低的积分成本提供大奖机会，既能消耗用户积分，又能提升平台活跃度。积分具有时效性，过期未使用的积分将自动清零，这是积分成本控制的重要手段。

**积分使用场景**：

| 使用场景 | 积分比例 | 抵扣上限 | 说明 |
|---------|---------|---------|------|
| 订单抵扣 | 100积分 = ¥1 | 订单金额的 20% | 积分直接抵扣现金 |
| 积分商城 | 根据商品定价 | 库存限制 | 兑换优惠券、服务券、礼品 |
| 积分抽奖 | 50积分/次 | 无 | 抽奖获取奖品 |
| 积分抵现 | 自定义比例 | 自定义 | 特殊活动使用 |

**积分过期规则**：

| 规则类型 | 说明 | 示例 |
|---------|------|------|
| 固定有效期 | 积分获得后 N 天过期 | 获得积分后 365 天过期 |
| 分批过期 | 按获得时间分批过期 | 先获得的先过期 |
| 永不过期 | 特定等级或活动 | 钻石会员积分永不过期 |

**会员积分服务 `MemberService`**：

```typescript
// backend/src/members/member.service.ts
@Injectable()
export class MemberService {
  constructor(
    private membersRepository: Repository<Member>,
    private pointsRecordsRepository: Repository<PointsRecord>,
    private memberLevelsRepository: Repository<MemberLevel>,
  ) {}

  // 用户消费后计算积分并升级
  async processOrderPoints(userId: number, orderAmount: number, orderId: number) {
    const member = await this.getOrCreateMember(userId);
    const level = await this.memberLevelsRepository.findOne(member.levelId);
    
    // 计算积分（基础积分 × 等级加成）
    const basePoints = Math.floor(orderAmount);
    const bonusMultiplier = level?.points_bonus || 1;
    const earnedPoints = Math.floor(basePoints * bonusMultiplier);
    
    // 更新积分
    member.currentPoints += earnedPoints;
    member.totalPoints += earnedPoints;
    member.totalConsume += orderAmount;
    member.lifetimeValue += orderAmount;
    
    // 检查是否升级
    await this.checkAndUpgrade(member);
    
    // 记录积分流水
    await this.pointsRecordsRepository.save({
      userId,
      action: 'order_complete',
      points: earnedPoints,
      balanceAfter: member.currentPoints,
      sourceType: 'order',
      sourceId: orderId,
      description: `订单消费获得积分`,
    });
    
    await this.membersRepository.save(member);
    
    return { earnedPoints, totalPoints: member.currentPoints };
  }

  // 检查并升级会员等级
  private async checkAndUpgrade(member: Member) {
    const levels = await this.memberLevelsRepository.find({
      order: { minAmount: 'ASC' },
    });
    
    let newLevelId = 1;
    for (const level of levels) {
      if (member.totalConsume >= level.minAmount) {
        newLevelId = level.id;
      }
    }
    
    if (newLevelId > member.levelId) {
      member.levelId = newLevelId;
      member.lastUpgradedAt = new Date();
      
      // 发送升级通知
      await this.notificationsService.send(
        member.userId,
        '会员升级',
        `恭喜您已升级为${levels.find(l => l.id === newLevelId)?.name}！`,
      );
    }
  }

  // 使用积分抵扣订单
  async usePointsForOrder(userId: number, orderId: number, points: number) {
    const member = await this.getOrCreateMember(userId);
    
    if (member.currentPoints < points) {
      throw new BadRequestException('积分不足');
    }
    
    // 检查积分是否在有效期内
    const validPoints = await this.getValidPoints(userId, points);
    if (validPoints < points) {
      throw new BadRequestException('部分积分已过期，无法使用');
    }
    
    // 抵扣比例：100积分 = 1元
    const discountAmount = points / 100;
    
    // 更新积分
    member.currentPoints -= points;
    await this.membersRepository.save(member);
    
    // 记录积分流水
    await this.pointsRecordsRepository.save({
      userId,
      action: 'order_deduct',
      points: -points,
      balanceAfter: member.currentPoints,
      sourceType: 'order',
      sourceId: orderId,
      description: `订单抵扣使用积分`,
    });
    
    return { discountAmount, usedPoints: points };
  }

  // 获取有效积分（未过期）
  private async getValidPoints(userId: number, requiredPoints: number): Promise<number> {
    const now = new Date();
    
    const records = await this.pointsRecordsRepository.find({
      where: {
        userId,
        points: MoreThan(0),
        expiredAt: MoreThan(now),
      },
      order: { createdAt: 'ASC' },
    });
    
    let validPoints = 0;
    for (const record of records) {
      validPoints += record.points;
      if (validPoints >= requiredPoints) break;
    }
    
    return validPoints;
  }

  // 处理过期积分（定时任务）
  async processExpiredPoints() {
    const now = new Date();
    const expiredRecords = await this.pointsRecordsRepository.find({
      where: {
        points: MoreThan(0),
        expiredAt: LessThanOrEqual(now),
      },
    });
    
    for (const record of expiredRecords) {
      if (record.points > 0) {
        const member = await this.membersRepository.findOne({
          where: { userId: record.userId },
        });
        
        if (member) {
          member.currentPoints -= record.points;
          member.totalPoints -= record.points;
          await this.membersRepository.save(member);
          
          await this.pointsRecordsRepository.save({
            ...record,
            points: -record.points,
            description: `积分过期扣除`,
          });
        }
      }
    }
  }

  // 获取用户会员信息
  async getMemberInfo(userId: number) {
    const member = await this.getOrCreateMember(userId);
    const level = await this.memberLevelsRepository.findOne(member.levelId);
    const nextLevel = await this.memberLevelsRepository.findOne({
      where: { minAmount: MoreThan(level?.minAmount || 0) },
      order: { minAmount: 'ASC' },
    });
    
    // 计算距离下一级还差多少
    let distanceToNext = 0;
    if (nextLevel) {
      distanceToNext = Math.max(0, nextLevel.minAmount - member.totalConsume);
    }
    
    return {
      level: level?.name,
      levelIcon: level?.icon,
      totalConsume: member.totalConsume,
      currentPoints: member.currentPoints,
      totalPoints: member.totalPoints,
      discountRate: level?.discountRate,
      pointsBonus: level?.pointsBonus,
      priorityOrder: level?.priorityOrder,
      dedicatedService: level?.dedicatedService,
      nextLevel: nextLevel?.name,
      distanceToNext,
      memberSince: member.memberSince,
    };
  }

  private async getOrCreateMember(userId: number): Promise<Member> {
    let member = await this.membersRepository.findOne({ where: { userId } });
    
    if (!member) {
      const defaultLevel = await this.memberLevelsRepository.findOne({
        where: { level: 1 },
      });
      
      member = await this.membersRepository.save({
        userId,
        levelId: defaultLevel?.id || 1,
        totalConsume: 0,
        currentPoints: 0,
        totalPoints: 0,
        lifetimeValue: 0,
        memberSince: new Date(),
      });
    }
    
    return member;
  }
}
```

### 14.4 积分商城

积分商城是积分体系的重要补充，为用户提供积分兑换商品的功能。积分商城商品包括平台优惠券（如满 ¥100 减 ¥20）、服务券（如免费保洁 1 次）、实物礼品（如品牌周边、家居用品）等。商品定价需要综合考虑积分获取难度、用户接受度、平台成本等因素，通常设置较低的上架数量以营造稀缺感。积分商城支持兑换记录查询、商品上架管理、库存管理等功能，管理员可以灵活配置商品上下架和库存数量。

**积分商城表 `points_mall_items` / 实体 `PointsMallItem`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `name` | string | 商品名称 |
| `type` | enum | 商品类型（coupon、service、gift） |
| `description` | string | 商品描述 |
| `image` | string | 商品图片 |
| `points_price` | number | 所需积分 |
| `stock` | number | 库存数量 |
| `total_stock` | number | 总库存 |
| `daily_limit` | number | 每人每日兑换上限 |
| `exchange_count` | number | 已兑换数量 |
| `is_active` | boolean | 是否上架 |
| `sort_order` | number | 排序 |
| `validity_days` | number | 有效期天数（券类） |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

**用户兑换记录表 `points_exchanges` / 实体 `PointsExchange`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 用户 ID |
| `item_id` | number | 商品 ID |
| `points_used` | number | 使用的积分 |
| `coupon_code` | string | 兑换券码（券类） |
| `status` | enum | 状态（pending、completed、expired） |
| `exchanged_at` | datetime | 兑换时间 |
| `used_at` | datetime | 使用时间 |
| `expired_at` | datetime | 过期时间 |

### 14.5 会员体系接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/members/info` | GET | 获取会员信息 | 用户 |
| `/members/points` | GET | 获取积分余额 | 用户 |
| `/members/points/history` | GET | 获取积分流水 | 用户 |
| `/members/points/use` | POST | 使用积分抵扣 | 用户 |
| `/members/points/exchange` | POST | 积分兑换商品 | 用户 |
| `/members/points/exchanges` | GET | 兑换记录 | 用户 |
| `/members/levels` | GET | 获取会员等级列表 | 公开 |
| `/members/level/current` | GET | 获取当前用户等级 | 用户 |
| `/admin/members` | GET | 会员列表 | 管理员 |
| `/admin/members/:id` | GET | 会员详情 | 管理员 |
| `/admin/members/levels` | CRUD | 等级配置管理 | 管理员 |
| `/admin/members/rules` | CRUD | 积分规则管理 | 管理员 |
| `/admin/members/mall-items` | CRUD | 积分商城管理 | 管理员 |

---

## 十五、数据统计与报表

### 15.1 核心指标体系

数据统计是运营决策的重要支撑，通过对平台各类数据进行收集、清洗、分析和展示，帮助管理者了解业务现状、发现问题、制定策略。核心指标体系分为用户指标、订单指标、财务指标、服务指标四大类。用户指标包括日活（DAU）、月活（MAU）、新增用户数、留存率、转化率、用户画像等，反映用户规模和用户质量。订单指标包括订单量、客单价、完单率、取消率、平均服务时长等，反映业务规模和业务效率。财务指标包括 GMV（交易总额）、平台收入、师傅收入、提现金额、退款金额等，反映平台盈利能力。服务指标包括好评率、投诉率、平均响应时间、服务质量评分等，反映服务质量水平。

**用户指标定义**：

| 指标 | 定义 | 计算方式 | 说明 |
|-----|------|---------|------|
| DAU | 日活跃用户数 | 每日启动 App 的去重用户数 | 反映用户活跃度 |
| MAU | 月活跃用户数 | 每月启动 App 的去重用户数 | 反映用户规模 |
| 新增用户 | 每日新增注册用户数 | 每日新注册用户数 | 反映拉新能力 |
| 次日留存率 | 次日回访用户比例 | 次日回访用户 / 当日新增用户 | 反映用户粘性 |
| 7日留存率 | 7日后回访用户比例 | 7日后回访用户 / 当日新增用户 | 反映短期留存 |
| 30日留存率 | 30日后回访用户比例 | 30日后回访用户 / 当日新增用户 | 反映长期留存 |
| 转化率 | 完成目标用户比例 | 完成目标用户 / 目标用户数 | 反映转化效率 |

**订单指标定义**：

| 指标 | 定义 | 计算方式 | 说明 |
|-----|------|---------|------|
| 订单量 | 订单总数 | 每日/每周/每月创建订单数 | 反映业务规模 |
| 客单价 | 平均订单金额 | 订单总金额 / 订单数 | 反映消费能力 |
| 完单率 | 完成订单比例 | 完成订单数 / 订单总数 | 反映服务完成情况 |
| 取消率 | 取消订单比例 | 取消订单数 / 订单总数 | 反映流失情况 |
| 平均服务时长 | 平均服务耗时 | 服务总时长 / 完单数 | 反映服务效率 |
| 预约转化率 | 预约转完成比例 | 完成订单数 / 预约订单数 | 反映预约质量 |

**财务指标定义**：

| 指标 | 定义 | 计算方式 | 说明 |
|-----|------|---------|------|
| GMV | 交易总额 | 订单实付金额合计 | 反映交易规模 |
| 平台收入 | 平台佣金收入 | GMV × 平均佣金率 | 反映平台盈利 |
| 师傅收入 | 师傅到账金额 | GMV × (1-佣金率) | 反映师傅收益 |
| 提现金额 | 师傅提现金额 | 提现成功订单金额 | 反映资金流动 |
| 退款金额 | 退款总额 | 退款成功订单金额 | 反映退款情况 |
| 净收入 | 平台实收 | 平台收入 - 退款金额 | 反映实际盈利 |

**服务指标定义**：

| 指标 | 定义 | 计算方式 | 说明 |
|-----|------|---------|------|
| 平均评分 | 师傅平均评分 | 评分总和 / 评价数 | 反映服务质量 |
| 好评率 | 好评占比 | 4-5星评价 / 总评价数 | 反映用户满意度 |
| 投诉率 | 投诉占比 | 投诉订单数 / 总订单数 | 反映问题发生率 |
| 响应时间 | 平均响应时长 | 订单创建到接单平均时间 | 反映响应速度 |
| 准时率 | 准时完成比例 | 准时完成订单 / 完单数 | 反映守时情况 |

### 15.2 统计服务实现

数据统计服务负责从数据库中聚合各类指标数据，支持多维度筛选和时间范围查询。统计服务采用定时任务和实时查询相结合的方式，核心指标（如日活、订单量）通过定时任务预先计算并缓存，实时指标（如当前在线师傅数）通过实时查询获取。统计结果支持按日、周、月维度聚合，支持同比、环比分析，帮助管理者了解业务趋势。

**统计服务 `StatsService`**：

```typescript
// backend/src/stats/stats.service.ts
@Injectable()
export class StatsService {
  constructor(
    private ordersRepository: Repository<Order>,
    private usersRepository: Repository<User>,
    private transactionsRepository: Repository<Transaction>,
    private ratingsRepository: Repository<Rating>,
    private complaintsRepository: Repository<Complaint>,
  ) {}

  // 运营仪表盘数据
  async getDashboardStats(dateRange: DateRangeDto) {
    const { startDate, endDate } = this.parseDateRange(dateRange);

    // 今日数据
    const today = await this.getTodayStats();

    // 订单趋势（按天）
    const orderTrend = await this.getOrderTrend(startDate, endDate);

    // 收入趋势（按天）
    const revenueTrend = await this.getRevenueTrend(startDate, endDate);

    // 服务分布（按服务类型）
    const serviceDistribution = await this.getServiceDistribution(startDate, endDate);

    // 师傅排行（TOP10）
    const workerRankings = await this.getWorkerRankings(startDate, endDate);

    // 待处理事项
    const pendingItems = await this.getPendingItems();

    return {
      today,
      orderTrend,
      revenueTrend,
      serviceDistribution,
      workerRankings,
      pendingItems,
    };
  }

  // 今日数据
  private async getTodayStats() {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const [todayOrders, todayRevenue, todayCompleted, todayNewUsers] = await Promise.all([
      this.ordersRepository.count({
        where: { createdAt: Between(todayStart, todayEnd) },
      }),
      this.ordersRepository
        .createQueryBuilder('order')
        .select('SUM(order.amount)', 'total')
        .where('order.createdAt BETWEEN :todayStart AND :todayEnd', { todayStart, todayEnd })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
      this.ordersRepository.count({
        where: { 
          status: OrderStatus.PAID,
          updatedAt: Between(todayStart, todayEnd),
        },
      }),
      this.usersRepository.count({
        where: { 
          role: 'customer',
          createdAt: Between(todayStart, todayEnd),
        },
      }),
    ]);

    // 环比数据（与昨日对比）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStats = await this.getDateStats(yesterday);

    return {
      todayOrders: todayOrders || 0,
      todayRevenue: parseFloat(todayRevenue?.total || 0),
      todayCompleted: todayCompleted || 0,
      todayNewUsers: todayNewUsers || 0,
      yesterdayOrders: yesterdayStats.orders,
      yesterdayRevenue: yesterdayStats.revenue,
      ordersGrowth: this.calcGrowth(todayOrders, yesterdayStats.orders),
      revenueGrowth: this.calcGrowth(todayRevenue?.total, yesterdayStats.revenue),
    };
  }

  // 订单趋势
  private async getOrderTrend(startDate: Date, endDate: Date) {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .select("DATE(order.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map(item => ({
      date: item.date,
      count: parseInt(item.count),
    }));
  }

  // 收入趋势
  private async getRevenueTrend(startDate: Date, endDate: Date) {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .select("DATE(order.createdAt)", 'date')
      .addSelect('SUM(order.amount)', 'revenue')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map(item => ({
      date: item.date,
      revenue: parseFloat(item.revenue || 0),
    }));
  }

  // 服务分布
  private async getServiceDistribution(startDate: Date, endDate: Date) {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.serviceType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.amount)', 'amount')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('order.serviceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      amount: parseFloat(item.amount || 0),
      percentage: total > 0 ? (parseInt(item.count) / total * 100).toFixed(1) : 0,
    }));
  }

  // 师傅排行
  private async getWorkerRankings(startDate: Date, endDate: Date) {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.worker', 'worker')
      .select('order.workerId', 'workerId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.amount)', 'revenue')
      .addSelect('AVG(worker.rating)', 'avgRating')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.workerId IS NOT NULL')
      .groupBy('order.workerId')
      .orderBy('orderCount', 'DESC')
      .limit(10)
      .getRawMany();

    // 获取师傅基本信息
    const workerIds = result.map(r => r.workerId);
    const workers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.workerProfile', 'profile')
      .where('user.id IN (:...workerIds)', { workerIds })
      .getMany();

    return result.map(item => {
      const worker = workers.find(w => w.id === item.workerId);
      return {
        workerId: item.workerId,
        name: worker?.workerProfile?.realName || worker?.nickname || '未知',
        avatar: worker?.avatar,
        orderCount: parseInt(item.orderCount),
        revenue: parseFloat(item.revenue || 0),
        avgRating: parseFloat(item.avgRating || 0),
      };
    });
  }

  // 待处理事项
  private async getPendingItems() {
    const [pendingWorkers, pendingWithdrawals, pendingComplaints] = await Promise.all([
      this.workerProfilesRepository.count({ where: { auditStatus: 0 } }),
      this.withdrawalsRepository.count({ where: { status: 'pending' } }),
      this.complaintsRepository.count({ where: { status: 'pending' } }),
    ]);

    return {
      pendingWorkers,
      pendingWithdrawals,
      pendingComplaints,
      total: pendingWorkers + pendingWithdrawals + pendingComplaints,
    };
  }

  // 订单统计报表
  async getOrderReport(query: DateRangeQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);

    const summary = await this.ordersRepository
      .createQueryBuilder('order')
      .select([
        'COUNT(*) AS totalOrders',
        'SUM(order.amount) AS totalAmount',
        'AVG(order.amount) AS avgAmount',
        'SUM(CASE WHEN order.status = :completed THEN 1 ELSE 0 END) AS completedOrders',
        'SUM(CASE WHEN order.status = :cancelled THEN 1 ELSE 0 END) AS cancelledOrders',
      ], {
        completed: OrderStatus.PAID,
        cancelled: OrderStatus.CANCELLED,
      })
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    const byServiceType = await this.getServiceDistribution(startDate, endDate);
    const byStatus = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('order.status')
      .getRawMany();

    return {
      summary: {
        totalOrders: parseInt(summary.totalOrders || 0),
        totalAmount: parseFloat(summary.totalAmount || 0),
        avgAmount: parseFloat(summary.avgAmount || 0),
        completedOrders: parseInt(summary.completedOrders || 0),
        cancelledOrders: parseInt(summary.cancelledOrders || 0),
        completionRate: parseInt(summary.totalOrders || 0) > 0 
          ? (parseInt(summary.completedOrders || 0) / parseInt(summary.totalOrders || 0) * 100).toFixed(1)
          : 0,
      },
      byServiceType,
      byStatus: byStatus.map(item => ({
        status: OrderStatus[item.status],
        count: parseInt(item.count),
      })),
    };
  }

  // 财务统计报表
  async getFinanceReport(query: DateRangeQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);

    const summary = await this.transactionsRepository
      .createQueryBuilder('t')
      .select([
        "SUM(CASE WHEN t.type = 'payment' THEN ABS(t.amount) ELSE 0 END) AS totalPayments",
        "SUM(CASE WHEN t.type = 'commission' THEN t.amount ELSE 0 END) AS totalCommission",
        "SUM(CASE WHEN t.type = 'withdrawal' THEN ABS(t.amount) ELSE 0 END) AS totalWithdrawals",
        "SUM(CASE WHEN t.type = 'refund' THEN ABS(t.amount) ELSE 0 END) AS totalRefunds",
      ])
      .where('t.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    const byDay = await this.transactionsRepository
      .createQueryBuilder('t')
      .select("DATE(t.createdAt)", 'date')
      .addSelect("SUM(CASE WHEN t.type = 'payment' THEN ABS(t.amount) ELSE 0 END)", 'revenue')
      .addSelect("SUM(CASE WHEN t.type = 'commission' THEN t.amount ELSE 0 END)", 'commission')
      .addSelect("SUM(CASE WHEN t.type = 'withdrawal' THEN ABS(t.amount) ELSE 0 END)", 'withdrawal')
      .where('t.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(t.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      summary: {
        totalPayments: parseFloat(summary.totalPayments || 0),
        totalCommission: parseFloat(summary.totalCommission || 0),
        totalWithdrawals: parseFloat(summary.totalWithdrawals || 0),
        totalRefunds: parseFloat(summary.totalRefunds || 0),
        netRevenue: parseFloat(summary.totalCommission || 0) - parseFloat(summary.totalRefunds || 0),
      },
      byDay: byDay.map(item => ({
        date: item.date,
        revenue: parseFloat(item.revenue || 0),
        commission: parseFloat(item.commission || 0),
        withdrawal: parseFloat(item.withdrawal || 0),
      })),
    };
  }

  // 用户统计报表
  async getUserReport(query: DateRangeQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);

    const newUsers = await this.usersRepository
      .createQueryBuilder('user')
      .select("DATE(user.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const byRole = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('user.role')
      .getRawMany();

    return {
      newUsers: newUsers.map(item => ({
        date: item.date,
        count: parseInt(item.count),
      })),
      byRole: byRole.map(item => ({
        role: item.role,
        count: parseInt(item.count),
      })),
    };
  }

  // 师傅统计报表
  async getWorkerReport(query: DateRangeQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);

    const workerStats = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.worker', 'worker')
      .select('order.workerId', 'workerId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.amount)', 'totalAmount')
      .addSelect('AVG(worker.rating)', 'avgRating')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.workerId IS NOT NULL')
      .groupBy('order.workerId')
      .getRawMany();

    // 获取师傅列表
    const workerIds = workerStats.map(w => w.workerId);
    const workers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.workerProfile', 'profile')
      .where('user.id IN (:...workerIds)', { workerIds })
      .getMany();

    return workerStats
      .filter(w => parseInt(w.orderCount) > 0)
      .map(w => {
        const worker = workers.find(u => u.id === w.workerId);
        return {
          workerId: w.workerId,
          name: worker?.workerProfile?.realName || worker?.nickname || '未知',
          orderCount: parseInt(w.orderCount),
          totalAmount: parseFloat(w.totalAmount || 0),
          avgRating: parseFloat(w.avgRating || 0),
        };
      })
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  private parseDateRange(query: DateRangeQueryDto) {
    const startDate = query.startDate 
      ? new Date(query.startDate) 
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate 
      ? new Date(query.endDate) 
      : new Date();
    
    return { startDate, endDate };
  }

  private async getDateStats(date: Date) {
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const [orders, revenue] = await Promise.all([
      this.ordersRepository.count({
        where: { createdAt: Between(start, end) },
      }),
      this.ordersRepository
        .createQueryBuilder('order')
        .select('SUM(order.amount)', 'total')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
    ]);

    return {
      orders,
      revenue: parseFloat(revenue?.total || 0),
    };
  }

  private calcGrowth(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  }
}
```

### 15.3 数据埋点

数据埋点是用户行为分析的基础，通过在前端埋点采集用户行为数据，分析用户路径、转化漏斗、用户偏好等。埋点数据包括页面访问（PV/UV）、按钮点击、停留时长、滑动行为等。埋点数据通过日志采集、实时传输到后端或第三方分析平台（如神策、Google Analytics）。埋点数据需要考虑数据量、采集精度、隐私合规等因素，合理设计埋点方案既能保证分析需求，又不会对系统造成过大压力。

**埋点数据表 `user_events` / 实体 `UserEvent`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 用户 ID（可空） |
| `session_id` | string | 会话 ID |
| `event_type` | string | 事件类型（page_view、click、stay、scroll） |
| `page_name` | string | 页面名称 |
| `element_id` | string | 元素 ID |
| `element_name` | string | 元素名称 |
| `event_data` | json | 事件数据 |
| `device_info` | json | 设备信息 |
| `location` | json | 位置信息 |
| `created_at` | datetime | 事件时间 |

**常用埋点事件**：

| 事件类型 | 事件名称 | 触发时机 | 说明 |
|---------|---------|---------|------|
| 页面访问 | page_view | 进入页面 | PV/UV 统计 |
| 按钮点击 | button_click | 点击按钮 | 功能使用统计 |
| 表单提交 | form_submit | 提交表单 | 转化率统计 |
| 停留时长 | stay | 页面切换 | 用户停留分析 |
| 搜索 | search | 发起搜索 | 搜索关键词分析 |
| 下单 | create_order | 创建订单 | 下单漏斗分析 |
| 支付 | payment | 支付成功 | 支付转化分析 |
| 分享 | share | 分享行为 | 传播效果分析 |

### 15.4 报表导出

报表导出功能支持将统计数据导出为 Excel 或 PDF 格式，方便管理者离线查看和汇报。导出功能采用异步任务方式实现，大数据量导出时通过消息队列处理，避免阻塞接口。导出文件通过邮件或站内消息发送给用户，或提供下载链接供用户主动下载。

**报表导出接口**：

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/stats/dashboard` | GET | 运营仪表盘数据 | 管理员 |
| `/stats/orders` | GET | 订单统计报表 | 管理员 |
| `/stats/finance` | GET | 财务统计报表 | 管理员 |
| `/stats/users` | GET | 用户统计报表 | 管理员 |
| `/stats/workers` | GET | 师傅统计报表 | 管理员 |
| `/stats/export` | POST | 报表导出（异步） | 管理员 |
| `/stats/export/:id` | GET | 导出进度/下载 | 管理员 |
| `/stats/realtime` | GET | 实时数据 | 管理员 |

---

## 十六、消息推送服务

### 16.1 推送渠道概述

消息推送是用户触达的重要手段，通过多种渠道将订单状态变更、系统通知、营销活动等信息及时传达给用户。推送渠道包括短信、APP 推送（极光推送、个推）、微信模板消息、站内消息等。不同渠道适用于不同场景：短信适合紧急通知（如验证码、服务提醒），APP 推送适合实时通知（如订单状态变更），微信模板消息适合服务通知（如付款通知），站内消息适合系统通知（如活动公告）。推送服务需要支持多渠道并行发送、智能路由（根据用户偏好选择渠道）、推送效果追踪（送达率、打开率）等功能。

**推送渠道枚举**：

```typescript
// backend/src/notifications/enums/channel.enum.ts
export enum NotificationChannel {
  SMS = 'sms',           // 短信
  PUSH = 'push',         // APP推送（极光/个推）
  WECHAT = 'wechat',     // 微信模板消息
  IN_APP = 'in_app',     // 站内消息
  EMAIL = 'email',       // 邮件（可选）
}

export enum NotificationPriority {
  LOW = 0,      // 低优先级（营销类）
  NORMAL = 1,   // 普通优先级（系统通知）
  HIGH = 2,     // 高优先级（订单相关）
  URGENT = 3,   // 紧急（验证码、服务提醒）
}
```

### 16.2 短信服务

短信服务主要用于验证码、服务提醒、紧急通知等场景。短信发送需要接入第三方短信平台（如阿里云短信、腾讯云短信），配置签名、模板、API 密钥等信息。短信发送需要控制频率，防止用户投诉和账号被封禁。短信模板需要提前在运营商处报备，模板内容不能包含敏感词和营销信息。短信发送记录需要保存，用于发送统计和失败重试。

**短信模板配置**：

| 模板名称 | 模板 ID | 适用场景 |
|---------|---------|---------|
| 验证码 | SMS_123456789 | 登录、注册、找回密码 |
| 订单创建提醒 | SMS_123456790 | 订单创建成功 |
| 师傅接单提醒 | SMS_123456791 | 师傅已接单 |
| 服务提醒 | SMS_123456792 | 服务即将开始 |
| 支付成功通知 | SMS_123456793 | 支付成功 |
| 评价提醒 | SMS_123456794 | 待评价订单 |
| 提现到账通知 | SMS_123456795 | 提现成功 |

**短信服务实现**：

```typescript
// backend/src/notifications/sms.service.ts
@Injectable()
export class SmsService {
  private readonly client: Client;

  constructor() {
    this.client = new Client(new Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: 'https://dysmsapi.aliyuncs.com',
    }));
  }

  // 发送短信
  async sendSMS(phone: string, templateCode: string, params: Record<string, any>) {
    try {
      const result = await this.client.sendSms({
        phoneNumbers: phone,
        signName: '好帮手家政',
        templateCode,
        templateParam: JSON.stringify(params),
      });

      if (result.body.code === 'OK') {
        return { success: true, messageId: result.body.bizId };
      } else {
        console.error('短信发送失败:', result.body);
        return { success: false, error: result.body.message };
      }
    } catch (error) {
      console.error('短信发送异常:', error);
      return { success: false, error: error.message };
    }
  }

  // 发送验证码
  async sendVerificationCode(phone: string, code: string) {
    return this.sendSMS(phone, 'SMS_123456789', { code: code, time: '5分钟' });
  }

  // 发送订单通知
  async sendOrderNotification(phone: string, orderNo: string, status: string) {
    const templates = {
      [OrderStatus.PENDING]: 'SMS_123456790',
      [OrderStatus.GRABBED]: 'SMS_123456791',
      [OrderStatus.COMPLETED]: 'SMS_123456794',
      [OrderStatus.PAID]: 'SMS_123456793',
    };

    const templateCode = templates[status];
    if (!templateCode) return { success: false, error: '无对应模板' };

    return this.sendSMS(phone, templateCode, { orderNo, time: new Date().toLocaleString() });
  }

  // 发送提现通知
  async sendWithdrawalNotification(phone: string, amount: number) {
    return this.sendSMS(phone, 'SMS_123456795', { amount: amount.toFixed(2), time: new Date().toLocaleString() });
  }
}
```

### 16.3 APP 推送

APP 推送通过集成第三方推送服务（如极光推送、个推）实现，支持推送通知到用户设备。APP 推送适用于已安装 App 的用户，相比短信具有成本低、送达快、支持富文本等优势。推送服务需要管理用户设备 token，在用户登录时收集并保存设备信息。推送支持单播（指定用户）、组播（指定标签）、广播（全部用户）三种方式。推送内容支持标题、正文、扩展字段（可用于跳转指定页面）。

**推送服务实现**：

```typescript
// backend/src/notifications/push.service.ts
@Injectable()
export class PushService {
  // 极光推送示例
  private jpush: JPush;

  constructor() {
    this.jpush = new JPush({
      appkey: process.env.JPUSH_APP_KEY,
      masterSecret: process.env.JPUSH_MASTER_SECRET,
    });
  }

  // 推送通知
  async pushNotification(userId: number, title: string, content: string, extras?: Record<string, any>) {
    try {
      const result = await this.jpush.push()
        .setPlatform('all')
        .setAudience(JPush.registration_id)  // 需要根据 userId 查询对应设备
        .setNotification({
          android: { alert: content, title, extras },
          ios: { alert: content, sound: 'default', extras },
        })
        .setMessage({ msg_content: content, title, content_type: 'notification', extras })
        .setOptions({ apns_production: process.env.NODE_ENV === 'production' })
        .send();

      return { success: true, messageId: result.msg_id };
    } catch (error) {
      console.error('APP 推送失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 推送消息（透传）
  async pushMessage(userId: number, title: string, content: string, msgType: string) {
    try {
      const result = await this.jpush.push()
        .setPlatform('all')
        .setAudience(JPush.registration_id)
        .setMessage({
          msg_content: content,
          title,
          content_type: msgType,
        })
        .send();

      return { success: true, messageId: result.msg_id };
    } catch (error) {
      console.error('透传消息推送失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 广播通知
  async broadcastNotification(title: string, content: string, extras?: Record<string, any>) {
    try {
      const result = await this.jpush.push()
        .setPlatform('all')
        .setAudience(JPush.all)
        .setNotification({
          android: { alert: content, title, extras },
          ios: { alert: content, sound: 'default', extras },
        })
        .setOptions({ apns_production: process.env.NODE_ENV === 'production' })
        .send();

      return { success: true, messageId: result.msg_id };
    } catch (error) {
      console.error('广播推送失败:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### 16.4 微信模板消息

微信模板消息用于向已关注公众号的用户推送服务通知，是微信小程序和公众号的重要通知渠道。模板消息需要提前在微信公众平台配置消息模板，获取模板 ID 后使用。模板消息支持跳转到小程序指定页面，适合订单状态变更、服务提醒等场景。模板消息有数量限制，需要合理规划使用场景。

**微信模板消息实现**：

```typescript
// backend/src/notifications/wechat.service.ts
@Injectable()
export class WechatService {
  private readonly accessToken: string;

  constructor(private configService: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    // 获取微信 access_token（建议缓存 2 小时）
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.configService.get('WECHAT_APPID')}&secret=${this.configService.get('WECHAT_APP_SECRET')}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.access_token;
  }

  // 发送模板消息
  async sendTemplateMessage(openId: string, templateId: string, data: Record<string, { value: string; color?: string }>, page?: string) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
      
      const body = {
        touser: openId,
        template_id: templateId,
        data,
        page,
        miniprogram: {
          appid: this.configService.get('WECHAT_MINI_APPID'),
          pagepath: page,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (result.errcode === 0) {
        return { success: true, messageId: result.msgid };
      } else {
        console.error('微信模板消息发送失败:', result);
        return { success: false, error: result.errmsg };
      }
    } catch (error) {
      console.error('微信模板消息异常:', error);
      return { success: false, error: error.message };
    }
  }

  // 发送订单状态通知
  async sendOrderStatusNotice(openId: string, orderNo: string, status: string, time: string) {
    const templateId = 'ORDER_STATUS_TEMPLATE_ID'; // 替换为实际模板 ID
    
    const data = {
      keyword1: { value: orderNo },
      keyword2: { value: status },
      keyword3: { value: time },
      keyword4: { value: '好帮手家政' },
    };

    return this.sendTemplateMessage(openId, templateId, data, `/pages/order/detail?orderNo=${orderNo}`);
  }

  // 发送支付成功通知
  async sendPaymentSuccessNotice(openId: string, orderNo: string, amount: string, time: string) {
    const templateId = 'PAYMENT_SUCCESS_TEMPLATE_ID'; // 替换为实际模板 ID
    
    const data = {
      keyword1: { value: orderNo },
      keyword2: { value: amount },
      keyword3: { value: time },
      keyword4: { value: '好帮手家政' },
    };

    return this.sendTemplateMessage(openId, templateId, data, `/pages/order/detail?orderNo=${orderNo}`);
  }
}
```

### 16.5 统一推送服务

统一推送服务封装多种推送渠道，提供统一的发送接口，根据通知类型和用户偏好自动选择合适的推送渠道。推送服务支持推送模板管理、推送任务调度、推送效果统计等功能。推送内容支持变量替换，如用户昵称、订单号、时间等。推送服务与消息队列集成，支持高并发推送场景。

**统一推送服务 `NotificationService`**：

```typescript
// backend/src/notifications/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    private smsService: SmsService,
    private pushService: PushService,
    private wechatService: WechatService,
    private notificationsRepository: Repository<Notification>,
    private userDevicesRepository: Repository<UserDevice>,
    private userPreferencesRepository: Repository<UserPreference>,
  ) {}

  // 发送通知（统一接口）
  async sendNotification(userId: number, type: NotificationType, title: string, content: string, data?: Record<string, any>) {
    // 获取用户偏好
    const preferences = await this.getUserPreferences(userId);
    
    // 获取用户信息
    const user = await this.usersRepository.findOne(userId);
    
    // 并行发送多渠道通知
    const results = await Promise.all([
      // 站内消息
      this.saveInAppNotification(userId, type, title, content, data),
      
      // APP 推送
      preferences.pushEnabled ? this.sendAppPush(userId, title, content, data) : null,
      
      // 短信（高优先级通知）
      preferences.smsEnabled && this.isHighPriority(type) 
        ? this.sendSMS(userId, title, content) : null,
      
      // 微信模板消息（已绑定微信的用户）
      preferences.wechatEnabled && user?.wechatOpenid
        ? this.sendWechatTemplate(user.wechatOpenid, type, content, data) : null,
    ]);

    return results.filter(r => r !== null);
  }

  // 发送订单相关通知
  async sendOrderNotification(order: Order, type: NotificationType) {
    const user = await this.usersRepository.findOne(order.customerId);
    const worker = order.workerId ? await this.usersRepository.findOne(order.workerId) : null;
    
    const title = this.getOrderNotificationTitle(type);
    const content = this.getOrderNotificationContent(order, type);
    
    // 通知客户
    if (user) {
      await this.sendNotification(order.customerId, type, title, content, {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus[type],
      });
    }
    
    // 通知师傅（如果已接单）
    if (worker && order.workerId) {
      await this.sendNotification(order.workerId, type, title, content, {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus[type],
      });
    }
  }

  private async saveInAppNotification(userId: number, type: NotificationType, title: string, content: string, data?: Record<string, any>) {
    return this.notificationsRepository.save({
      userId,
      type,
      title,
      content,
      data,
      channel: 'in_app',
      status: 'pending',
    });
  }

  private async sendAppPush(userId: number, title: string, content: string, data?: Record<string, any>) {
    const devices = await this.userDevicesRepository.find({ where: { userId } });
    
    for (const device of devices) {
      await this.pushService.pushNotification(device.registrationId, title, content, {
        ...data,
        clickAction: 'openPage',
      });
    }
    
    return { success: true, count: devices.length };
  }

  private async sendSMS(userId: number, title: string, content: string) {
    const user = await this.usersRepository.findOne(userId);
    if (!user?.phone) return null;
    
    return this.smsService.sendSMS(user.phone, 'SMS_DEFAULT', { 
      title: title.substring(0, 20),
      content: content.substring(0, 40),
    });
  }

  private async sendWechatTemplate(openId: string, type: NotificationType, content: string, data?: Record<string, any>) {
    const templateMap = {
      [NotificationType.ORDER_STATUS]: 'ORDER_STATUS_TEMPLATE_ID',
      [NotificationType.PAYMENT_SUCCESS]: 'PAYMENT_SUCCESS_TEMPLATE_ID',
      [NotificationType.REVIEW_REMINDER]: 'REVIEW_REMINDER_TEMPLATE_ID',
    };
    
    const templateId = templateMap[type];
    if (!templateId) return null;
    
    return this.wechatService.sendTemplateMessage(openId, templateId, {
      first: { value: content },
      keyword1: { value: data?.orderNo || '' },
      keyword2: { value: new Date().toLocaleString() },
    });
  }

  private isHighPriority(type: NotificationType): boolean {
    return [
      NotificationType.ORDER_STATUS,
      NotificationType.PAYMENT_SUCCESS,
      NotificationType.WITHDRAWAL_SUCCESS,
    ].includes(type);
  }
}
```

### 16.6 用户通知偏好

用户通知偏好设置允许用户选择希望接收的通知渠道和通知类型，提升用户体验和减少骚扰。偏好设置支持渠道开关（是否接收短信、APP 推送、微信通知）和类型开关（是否接收订单通知、营销通知、系统公告）。默认设置根据用户使用场景智能推荐，如绑定微信的用户默认开启微信通知，开启推送权限的用户默认开启 APP 推送。

**用户偏好表 `user_preferences` / 实体 `UserPreference`**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | number | 主键 |
| `user_id` | number | 用户 ID |
| `sms_enabled` | boolean | 短信通知开关 |
| `push_enabled` | boolean | APP 推送开关 |
| `wechat_enabled` | boolean | 微信通知开关 |
| `order_notifications` | boolean | 订单通知 |
| `marketing_notifications` | boolean | 营销通知 |
| `system_notifications` | boolean | 系统通知 |
| `quiet_hours_start` | time | 免打扰开始时间 |
| `quiet_hours_end` | time | 免打扰结束时间 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

### 16.7 推送服务接口列表

| 接口 | 方法 | 说明 | 权限 |
|-----|------|------|------|
| `/notifications/channels` | GET | 获取可用推送渠道 | 公开 |
| `/notifications/preferences` | GET | 获取用户通知偏好 | 用户 |
| `/notifications/preferences` | PUT | 更新用户通知偏好 | 用户 |
| `/notifications/list` | GET | 获取通知列表 | 用户 |
| `/notifications/unread-count` | GET | 获取未读通知数 | 用户 |
| `/notifications/:id/read` | PUT | 标记通知已读 | 用户 |
| `/notifications/read-all` | PUT | 全部已读 | 用户 |
| `/admin/notifications/send` | POST | 手动发送通知 | 管理员 |
| `/admin/notifications/templates` | CRUD | 通知模板管理 | 管理员 |
| `/admin/notifications/statistics` | GET | 推送统计报表 | 管理员 |
| `/admin/notifications/broadcast` | POST | 系统广播 | 管理员 |

---

## 十七、性能优化与缓存策略

### 17.1 缓存策略设计

缓存是提升系统性能的重要手段，通过将热点数据存储在内存中，减少数据库查询次数，降低接口响应时间。缓存策略设计需要根据数据特性选择合适的缓存方案，包括缓存什么数据、缓存多长时间、如何保证数据一致性。家政服务平台中适合缓存的数据包括：服务分类列表、师傅信息（评分、服务次数）、Banner 配置、平台参数等变化频率低、读取频率高的数据。缓存实现使用 Redis，支持过期时间设置和多种数据结构。

**缓存策略分类**：

| 缓存类型 | 数据示例 | TTL 设置 | 说明 |
|---------|---------|---------|------|
| 热点数据 | 服务分类、Banner | 24小时 | 变化极低的数据 |
| 中期数据 | 师傅信息、热门服务 | 1-6小时 | 变化较低的数据 |
| 短期数据 | 订单状态、通知数 | 5-30分钟 | 变化较频繁的数据 |
| 会话数据 | 用户 Session、购物车 | 7天 | 用户相关数据 |

**缓存服务实现**：

```typescript
// backend/src/cache/cache.service.ts
@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    });
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  // 设置缓存
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  // 删除缓存
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // 批量删除（模式匹配）
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 分布式锁
  async acquireLock(lockName: string, ttlSeconds: number = 10): Promise<string | null> {
    const lockValue = `lock_${Date.now()}_${Math.random()}`;
    const acquired = await this.redis.set(lockName, lockValue, 'EX', ttlSeconds, 'NX');
    return acquired === 'OK' ? lockValue : null;
  }

  async releaseLock(lockName: string, lockValue: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, lockName, lockValue);
  }

  // 缓存击穿处理（单线程获取）
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value !== null) {
      return value;
    }
    
    // 获取锁
    const lockKey = `lock:${key}`;
    const lockValue = await this.acquireLock(lockKey, 10);
    
    try {
      if (lockValue) {
        // 双重检查
        value = await this.get<T>(key);
        if (value !== null) {
          return value;
        }
        
        // 获取数据
        value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
      }
      
      // 等待锁释放后重试
      await this.sleep(100);
      return this.getOrSet(key, fetchFn, ttlSeconds);
    } finally {
      if (lockValue) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 17.2 接口性能优化

接口性能优化是保障用户体验的关键，需要从数据库查询、代码逻辑、网络传输等多个维度进行优化。数据库层面需要优化索引设计、避免全表扫描、使用读写分离。代码层面需要减少 N+1 查询、使用批量操作、优化循环逻辑。网络层面需要开启 Gzip 压缩、减少请求数据量、使用 CDN 加速静态资源。

**性能优化实践**：

```typescript
// 优化示例：批量查询替代循环查询
// ❌ 错误示例（N+1 查询）
@Injectable()
export class BadExampleService {
  async getOrdersWithCustomer(userId: number) {
    const orders = await this.ordersRepository.find({ where: { userId } });
    // 循环查询客户信息（N+1 问题）
    const ordersWithCustomer = orders.map(async order => {
      order.customer = await this.usersRepository.findOne(order.customerId);
      return order;
    });
    return Promise.all(ordersWithCustomer);
  }
}

// ✅ 正确示例（使用 eager loading）
@Injectable()
export class GoodExampleService {
  async getOrdersWithCustomer(userId: number) {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['customer'],  // 一次性查询
    });
  }
}

// 优化示例：分页查询优化
@Injectable()
export class PaginationService {
  async getOrders(page: number, pageSize: number) {
    // 使用游标分页（适合大表）
    const [orders, total] = await this.ordersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

// 优化示例：减少返回字段
@Injectable()
export class LightweightService {
  async getOrderList(userId: number) {
    // 只查询需要的字段
    return this.ordersRepository
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.orderNo',
        'order.serviceType',
        'order.status',
        'order.amount',
        'order.createdAt',
      ])
      .where('order.customerId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }
}
```

### 17.3 数据库优化

数据库优化是系统性能优化的核心，包括索引优化、查询优化、分库分表等。索引优化需要分析慢查询日志，针对高频查询场景添加合适的索引。查询优化需要避免全表扫描、使用覆盖索引、优化 JOIN 查询。分库分表用于解决单表数据量过大的问题，通常按用户 ID 或时间进行分片。

**索引优化示例**：

```sql
-- 订单表索引优化
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status, created_at DESC);
CREATE INDEX idx_orders_worker_status ON orders(worker_id, status);
CREATE INDEX idx_orders_service_time ON orders(service_time, status);
CREATE INDEX idx_orders_created_at_status ON orders(created_at, status);

-- 用户表索引优化
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 评价表索引优化
CREATE INDEX idx_ratings_worker_id ON ratings(worker_id, created_at DESC);
CREATE INDEX idx_ratings_order_id ON ratings(order_id);
```

**分表策略**：

```typescript
// 按用户 ID 取模分表
function getTableName(tableName: string, userId: number): string {
  const tableCount = 16;  // 16 张表
  const tableIndex = userId % tableCount;
  return `${tableName}_${tableIndex}`;
}

// 使用 Sharding（需要数据库中间件支持）
// 推荐方案：ShardingSphere、MyCat、TiDB
```

### 17.4 前端性能优化

前端性能优化直接影响用户感知的加载速度和交互流畅度。优化措施包括路由懒加载（按需加载页面组件）、组件按需引入（避免全量引入 UI 库）、图片优化（懒加载、压缩、CDN 加速）、接口优化（请求合并、缓存、预加载）。

**前端性能优化实践**：

```typescript
// 路由懒加载
// router/index.js
const routes = [
  {
    path: '/order/create',
    component: () => import(/* webpackChunkName: "order" */ '@/views/OrderCreate.vue'),
  },
  {
    path: '/profile',
    component: () => import(/* webpackChunkName: "profile" */ '@/views/Profile.vue'),
  },
];

// 接口请求缓存
// utils/cache.js
const requestCache = new Map();

async function cachedRequest(url, fetchFn, cacheTime = 60000) {
  const now = Date.now();
  const cache = requestCache.get(url);
  
  if (cache && now - cache.time < cacheTime) {
    return cache.data;
  }
  
  const data = await fetchFn();
  requestCache.set(url, { data, time: now });
  return data;
}

// 图片懒加载
// <img v-lazy="imageUrl" />
import VueLazyload from 'vue-lazyload';
Vue.use(VueLazyload, {
  preLoad: 1.3,
  error: '/images/error.png',
  loading: '/images/loading.gif',
});
```

### 17.5 限流与熔断

限流和熔断是保障系统稳定性的重要手段。限流用于控制请求频率，防止系统被高频请求打垮。熔断用于在下游服务异常时快速失败，避免故障蔓延。限流可以使用 Redis 计数器实现，熔断可以使用 Hystrix 或 Resilience4j 模式实现。

**限流实现**：

```typescript
// 使用 @nestjs/throttler
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,      // 时间窗口（毫秒）
      limit: 100,     // 最大请求数
    }]),
  ],
})
export class AppModule {}

// 敏感接口限流（更严格）
@Controller('payment')
@UseGuards(ThrottlerGuard)
@ThrottlerModule.ThrottlerGuard({ ttl: 60000, limit: 10 })  // 1分钟最多10次
export class PaymentController {}

// 自定义限流装饰器
export function RateLimit(maxRequests: number, ttlSeconds: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const cacheKey = `ratelimit:${this.constructor.name}:${propertyKey}:${args[0]?.userId || 'anonymous'}`;
      const cache = this.cacheService;
      
      const count = await cache.get(cacheKey) || 0;
      if (count >= maxRequests) {
        throw new HttpException('请求过于频繁', HttpStatus.TOO_MANY_REQUESTS);
      }
      
      await cache.set(cacheKey, count + 1, ttlSeconds);
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
```

**熔断器实现**（简化版）：

```typescript
// 熔断器状态
enum CircuitState {
  CLOSED = 'closed',    // 正常
  OPEN = 'open',        // 断开
  HALF_OPEN = 'half_open',  // 半开
}

@Injectable()
export class CircuitBreakerService {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date;
  
  // 配置
  private readonly failureThreshold = 5;   // 失败阈值
  private readonly successThreshold = 2;    // 半开状态成功阈值
  private readonly timeout = 30000;         // 熔断时长（毫秒）

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime.getTime() > this.timeout) {
        this.state = CircuitState.HALF_OPEN;  // 进入半开状态
      } else {
        throw new HttpException('服务暂时不可用', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

### 17.6 性能监控

性能监控是发现和解决性能问题的关键，需要建立完善的监控体系，包括接口响应时间、数据库查询时间、缓存命中率、错误率等指标。监控数据通过 Prometheus 采集，Grafana 展示，设置告警阈值，当指标异常时及时通知运维人员。

**性能指标采集**：

```typescript
// 性能指标服务
@Injectable()
export class MetricsService {
  private requestDuration: Histogram;
  private dbQueryDuration: Histogram;
  private cacheHitRate: Counter;
  private errorRate: Counter;

  constructor() {
    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP 请求响应时间',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: '数据库查询响应时间',
      labelNames: ['query_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });

    this.cacheHitRate = new Counter({
      name: 'cache_hits_total',
      help: '缓存命中次数',
      labelNames: ['operation', 'hit'],
    });

    this.errorRate = new Counter({
      name: 'errors_total',
      help: '错误总数',
      labelNames: ['type', 'route'],
    });
  }

  // 记录请求时间
  recordRequest(method: string, route: string, status: number, duration: number) {
    this.requestDuration.observe({ method, route, status: status.toString() }, duration / 1000);
  }

  // 记录数据库查询时间
  recordDbQuery(queryType: string, duration: number) {
    this.dbQueryDuration.observe({ queryType }, duration / 1000);
  }

  // 记录缓存命中
  recordCacheHit(operation: string, hit: boolean) {
    this.cacheHitRate.inc({ operation, hit: hit ? 'true' : 'false' });
  }

  // 记录错误
  recordError(type: string, route: string) {
    this.errorRate.inc({ type, route });
  }
}
```

---

## 十八、小程序与多端适配

### 18.1 技术选型

多端开发是提升开发效率和用户覆盖面的重要策略，家政服务 App 通常需要支持微信小程序、支付宝小程序、H5 页面、APP（可选）等多个端。推荐使用跨端开发框架，如 Uni-app 或 Taro，实现一套代码、多端运行。跨端框架通过编译时适配和运行时适配，将代码转换为各端原生代码或 Web 代码。选择跨端框架需要考虑生态完善度、性能表现、社区活跃度、学习成本等因素。

**跨端框架对比**：

| 框架 | 支持平台 | 开发语言 | 生态完善度 | 性能 | 社区活跃度 |
|-----|---------|---------|------------|------|-----------|
| Uni-app | 小程序 + APP + H5 | Vue | 优秀 | 良好 | 非常活跃 |
| Taro | 小程序 + APP + H5 | React | 优秀 | 良好 | 活跃 |
| Flutter | APP（H5 实验性） | Dart | 良好 | 优秀 | 活跃 |
| 原生开发 | 指定平台 | 原生语言 | - | 最优 | - |

**推荐方案**：
- **首选 Uni-app**：Vue 语法生态完善，与当前项目技术栈一致（前端使用 Vue 3）
- **备选 Taro**：如果前端团队更熟悉 React

### 18.2 Uni-app 项目结构

Uni-app 项目结构与 Vue 项目类似，通过条件编译处理各端差异。项目包含 pages（页面）、components（组件）、static（静态资源）、utils（工具函数）等目录，通过 `manifest.json` 配置各端参数，通过 `pages.json` 配置页面路由和窗口样式。

**Uni-app 项目结构**：

```
├── pages/
│   ├── index/                    # 首页
│   │   ├── index.vue
│   │   └── index.uvue            # 原生渲染页面（可选）
│   ├── order/                    # 订单相关
│   │   ├── create.vue            # 创建订单
│   │   ├── list.vue              # 订单列表
│   │   └── detail.vue            # 订单详情
│   ├── user/                     # 用户相关
│   │   ├── profile.vue           # 个人中心
│   │   ├── wallet.vue            # 钱包
│   │   └── settings.vue          # 设置
│   └── worker/                   # 师傅端
│       ├── home.vue              # 师傅首页
│       └── orders.vue            # 订单列表
├── components/
│   ├── common/                   # 通用组件
│   └── business/                  # 业务组件
├── static/
│   ├── images/                   # 图片资源
│   └── icons/                    # 图标
├── utils/
│   ├── request.js                # 网络请求封装
│   ├── auth.js                   # 认证相关
│   └── cache.js                  # 缓存工具
├── App.vue                       # 应用入口
├── main.js                       # 入口文件
├── manifest.json                 # 应用配置
└── pages.json                    # 页面路由配置
```

### 18.3 平台差异适配

不同平台存在 API 差异，需要通过条件编译或运行时判断处理。常见的差异包括：授权流程差异（微信登录、手机号授权）、支付差异（微信支付、支付宝支付）、组件差异（地图组件、客服组件）。条件编译使用 `uni-app` 提供的注释语法，运行时判断使用 `uni.getSystemInfoSync().platform` 获取当前平台。

**条件编译示例**：

```vue
<template>
  <view>
    <!-- #ifdef MP-WEIXIN -->
    <button open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
      微信一键登录
    </button>
    <!-- #endif -->
    
    <!-- #ifdef MP-ALIPAY -->
    <button @tap="onAlipayLogin">
      支付宝登录
    </button>
    <!-- #endif -->
    
    <!-- #ifdef H5 -->
    <button @tap="onH5Login">
      手机号登录
    </button>
    <!-- #endif -->
  </view>
</template>

<script>
export default {
  methods: {
    // 微信登录
    // #ifdef MP-WEIXIN
    async onGetPhoneNumber(e) {
      if (e.detail.code) {
        const code = e.detail.code;
        // 调用后端微信登录接口
        const res = await this.$http.post('/auth/wechat-mini-login', { code });
        this.handleLoginSuccess(res.data);
      }
    },
    // #endif
    
    // 支付宝登录
    // #ifdef MP-ALIPAY
    async onAlipayLogin() {
      my.getAuthCode({
        scopes: 'auth_base',
        success: (res) => {
          const authCode = res.authCode;
          this.$http.post('/auth/alipay-mini-login', { authCode });
        },
      });
    },
    // #endif
    
    // H5 登录
    // #ifdef H5
    async onH5Login() {
      // 手机号+验证码登录
      uni.navigateTo({ url: '/pages/user/login' });
    },
    // #endif
  }
}
</script>
```

**运行时平台判断**：

```typescript
// utils/platform.js
export function getPlatform() {
  const systemInfo = uni.getSystemInfoSync();
  return systemInfo.platform;  // 'devtools', 'ios', 'android', 'mp-weixin', 'mp-alipay'
}

export function isWeixinMiniApp() {
  return getPlatform() === 'mp-weixin';
}

export function isAlipayMiniApp() {
  return getPlatform() === 'mp-alipay';
}

export function isH5() {
  return process.env.UNI_PLATFORM === 'h5';
}

export function isApp() {
  const platform = getPlatform();
  return platform === 'ios' || platform === 'android';
}

// 平台特定的 API 调用
export function callPlatformAPI(apiName, options = {}) {
  const platform = getPlatform();
  
  switch (platform) {
    case 'mp-weixin':
      return callWeixinAPI(apiName, options);
    case 'mp-alipay':
      return callAlipayAPI(apiName, options);
    case 'ios':
    case 'android':
      return callAppAPI(apiName, options);
    default:
      return callH5API(apiName, options);
  }
}
```

### 18.4 支付对接

小程序支付需要分别对接微信支付和支付宝支付，H5 支付通常跳转到浏览器进行支付。支付流程：小程序调用支付接口获取支付参数，前端调用支付 SDK 唤起支付，支付成功后由支付平台回调后端接口更新订单状态。

**小程序支付实现**：

```typescript
// utils/payment.js

// 微信小程序支付
export function wechatPay(paymentData) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: paymentData.timeStamp,
      nonceStr: paymentData.nonceStr,
      package: paymentData.package,
      signType: paymentData.signType,
      paySign: paymentData.paySign,
      success: resolve,
      fail: reject,
    });
  });
}

// 支付宝小程序支付
export function alipayPay(orderInfo) {
  return new Promise((resolve, reject) => {
    my.tradePay({
      tradeNO: orderInfo.tradeNO,
      success: resolve,
      fail: reject,
    });
  });
}

// 统一下单接口
export async function createPayment(orderId, payType) {
  const res = await request.post('/payment/create', {
    orderId,
    payType,  // 'wechat' 或 'alipay'
  });
  
  const platform = getPlatform();
  
  if (platform === 'mp-weixin') {
    return wechatPay(res.data);
  } else if (platform === 'mp-alipay') {
    return alipayPay(res.data);
  } else {
    // H5 跳转支付
    window.location.href = res.data.h5Url;
  }
}
```

### 18.5 地图与定位

地图功能是家政服务的核心功能之一，用于用户选择服务地址、师傅定位、距离计算等。小程序需要接入对应平台的地图 SDK（微信使用腾讯地图、支付宝使用高德/高德地图）。地图功能包括定位获取、逆地理编码（经纬度转地址）、地理编码（地址转经纬度）、地图选点、路线规划等。

**地图适配实现**：

```typescript
// utils/location.js

// 获取当前位置
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    const platform = getPlatform();
    
    if (platform === 'mp-weixin') {
      wx.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
        ...options,
      });
    } else if (platform === 'mp-alipay') {
      my.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
      });
    } else if (platform === 'h5') {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        reject,
        options,
      );
    } else {
      // APP 端
      uni.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
      });
    }
  });
}

// 逆地理编码（经纬度转地址）
export async function getAddressFromCoords(lat, lng) {
  const platform = getPlatform();
  
  if (platform === 'mp-weixin') {
    // 腾讯地图 API
    const res = await request.get('/api/location/reverse-geocode', {
      location: `${lat},${lng}`,
    });
    return res.data;
  } else if (platform === 'mp-alipay') {
    // 高德地图 API
    const res = await request.get('/api/location/reverse-geocode', {
      location: `${lng},${lat}`,  // 高德是经纬度在前
    });
    return res.data;
  }
}

// 地图选点
export function chooseLocation(options = {}) {
  return new Promise((resolve, reject) => {
    const platform = getPlatform();
    
    if (platform === 'mp-weixin') {
      wx.chooseLocation({
        success: resolve,
        fail: reject,
        ...options,
      });
    } else if (platform === 'mp-alipay') {
      my.chooseLocation({
        success: resolve,
        fail: reject,
      });
    } else {
      // H5 或 APP
      uni.chooseLocation({
        success: resolve,
        fail: reject,
      });
    }
  });
}
```

### 18.6 分享与客服

分享功能是家政服务推广的重要渠道，支持分享订单、服务、邀请好友等。微信小程序支持多种分享方式（分享给好友、分享到朋友圈），支付宝小程序支持分享到支付宝好友。客服功能用于用户咨询，需要接入微信小程序客服或支付宝小程序客服 API。

**分享与客服实现**：

```vue
<template>
  <view>
    <!-- 分享按钮 -->
    <button @tap="onShareAppMessage">
      分享给好友
    </button>
    
    <!-- #ifdef MP-WEIXIN -->
    <button open-type="contact">
      微信客服
    </button>
    <!-- #endif -->
    
    <!-- #ifdef MP-ALIPAY -->
    <button @tap="onContact">
      支付宝客服
    </button>
    <!-- #endif -->
  </view>
</template>

<script>
export default {
  // 分享给好友
  onShareAppMessage() {
    return {
      title: '好帮手家政，专业服务',
      path: `/pages/index/index?inviterId=${this.userInfo.id}`,
      imageUrl: '/static/images/share-cover.png',
    };
  },
  
  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '好帮手家政，专业服务',
      query: `inviterId=${this.userInfo.id}`,
    };
  },
  
  // #ifdef MP-ALIPY
  // 支付宝客服
  onContact() {
    my.openCustomerService({
      corpId: 'CORP_ID',  // 企业 ID
      url: 'https://crm.im/r/xxxx',  // 客服链接
    });
  },
  // #endif
}
</script>
```

### 18.7 多端适配接口列表

| 功能 | 微信小程序 | 支付宝小程序 | H5 | APP |
|-----|-----------|------------|-----|-----|
| 用户登录 | ✓ | ✓ | ✓ | ✓ |
| 手机号授权 | ✓ | ✓ | 表单输入 | 表单输入 |
| 微信支付 | ✓ | - | 跳转支付 | SDK 支付 |
| 支付宝支付 | - | ✓ | 跳转支付 | SDK 支付 |
| 地图定位 | 腾讯地图 | 高德地图 | 高德/百度 | 腾讯地图 |
| 分享好友 | ✓ | ✓ | ✓ | ✓ |
| 分享朋友圈 | ✓ | - | - | - |
| 客服消息 | ✓ | ✓ | - | - |
| 订阅消息 | ✓ | ✓ | - | - |
| 推送通知 | ✓ | ✓ | - | ✓ |

---

本 Skill 已更新至 2024 年 2 月版本，新增会员与积分体系、数据统计与报表、消息推送服务、性能优化与缓存、小程序与多端适配等扩展章节。建议在使用前先通读相关章节，建立整体认知，开发时再查阅具体实现细节。

---