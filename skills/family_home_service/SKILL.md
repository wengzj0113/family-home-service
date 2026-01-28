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

