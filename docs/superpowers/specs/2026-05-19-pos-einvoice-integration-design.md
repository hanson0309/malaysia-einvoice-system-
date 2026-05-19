# POS 系统与电子发票系统集成设计方案

**日期**: 2026-05-19  
**版本**: 1.0  
**状态**: 待审核

## 1. 项目概述

### 1.1 目标

开发一个基于 Flutter 的 POS（Point of Sale）系统，与现有的 Malaysia E-Invoice System 集成，实现：
- 零售店和服务业的销售管理
- 完全离线操作能力
- 自动生成并提交电子发票到 LHDN
- 支持多种硬件设备（打印机、扫描枪、刷卡机等）

### 1.2 业务场景

**目标用户**:
- 零售店（服装、杂货等）
- 服务业（美容院、维修店等）

**核心需求**:
- 离线收银（网络断开时仍能正常操作）
- 库存管理（进货、销售、盘点、批次追踪）
- 预约管理（可选模块，服务业使用）
- 多收银员管理（权限控制）
- 批量发票生成和提交

### 1.3 架构选择

**方案**: 紧耦合架构（扩展现有系统）

```
POS App (Flutter) ←→ 现有 E-Invoice Backend (扩展 API)
     ↓                           ↓
SQLite (本地)              MongoDB + Redis
```

**理由**:
- 单店起步，不需要过度设计
- 复用现有认证、租户隔离、数据库
- 开发速度快，运维成本低
- Flutter 离线能力解决性能需求
- 未来可逐步拆分

## 2. 整体架构

### 2.1 系统组成

**POS App (Flutter)**
- 跨平台应用（Android/iOS 平板，Windows/macOS 桌面）
- 本地 SQLite 数据库（离线数据存储）
- 通过 REST API 与后端通信
- 支持蓝牙/USB 硬件设备连接

**扩展后的 E-Invoice Backend**
- 现有功能保持不变
- 新增 POS 相关 API 端点
- 新增 POS 数据模型（MongoDB collections）
- 批量发票提交任务（复用现有机制）

### 2.2 数据流

```
[POS App] 
   ↓ 离线操作
[SQLite 本地数据库]
   ↓ 网络恢复时同步
[Backend API]
   ↓ 存储
[MongoDB]
   ↓ 批量提交（用户控制）
[LHDN MyInvois API]
```

### 2.3 关键设计决策

1. **离线优先**: POS App 所有操作先写入本地 SQLite，网络可用时后台同步
2. **最终一致性**: 接受短暂的数据不一致，通过同步机制保证最终一致
3. **即时发票**: 付款完成时立即创建 Invoice 记录（状态为 draft）
4. **批量提交**: 用户控制何时提交发票到 LHDN（手动或定时）
5. **租户隔离**: 复用现有的 tenant_id 机制，POS 数据也按租户隔离
6. **模块化**: 功能模块可开关（预约、库存等）

## 3. 现有系统扩展

### 3.1 新增数据模型（MongoDB Collections）

#### PosDevice（POS 设备）
```javascript
{
  device_id: UUID,              // 设备唯一标识
  tenant_id: ObjectId,          // 所属租户
  device_name: String,          // 设备名称（如"收银台1"）
  device_type: String,          // 'tablet', 'desktop'
  pairing_code: String,         // 6位配对码
  pairing_code_expires_at: Date,// 配对码过期时间（15分钟）
  status: String,               // 'pending', 'active', 'inactive'
  last_sync_at: Date,           // 最后同步时间
  device_token: String,         // 设备专用 JWT token
  created_at: Date,
  activated_at: Date
}
```

#### PosTransaction（销售交易）
```javascript
{
  transaction_id: UUID,         // 本地生成的唯一标识
  tenant_id: ObjectId,
  transaction_number: String,   // 交易流水号
  transaction_date: Date,
  cashier_id: ObjectId,         // 收银员
  customer_id: ObjectId,        // 可选，关联到 Customer
  items: [{
    product_id: ObjectId,
    description: String,
    quantity: Number,
    unit_price: Number,
    tax_type: String,
    tax_rate: Number,
    tax_amount: Number,
    line_total: Number
  }],
  subtotal: Number,
  tax_amount: Number,
  total_amount: Number,
  payment_method: String,       // 'cash', 'card', 'ewallet'
  payment_status: String,       // 'paid', 'partial', 'refund'
  invoice_id: ObjectId,         // 关联生成的发票
  synced_at: Date,
  device_id: UUID,
  created_at: Date
}
```

#### PosProduct（扩展现有 Product）
```javascript
{
  // 继承现有 Product 模型的所有字段
  // 新增字段：
  barcode: String,              // 条码
  stock_quantity: Number,       // 库存数量
  reorder_level: Number,        // 补货警戒线
  batch_number: String,         // 批次号
  expiry_date: Date,            // 过期日期
  cost_price: Number            // 成本价
}
```

#### PosInventoryLog（库存日志）
```javascript
{
  tenant_id: ObjectId,
  product_id: ObjectId,
  transaction_type: String,     // 'purchase', 'sale', 'adjustment', 'stocktake'
  quantity_change: Number,      // 数量变化（正负）
  before_quantity: Number,
  after_quantity: Number,
  reference_id: String,         // 关联交易或进货单
  notes: String,
  created_by: ObjectId,
  created_at: Date
}
```

#### PosAppointment（预约 - 可选模块）
```javascript
{
  tenant_id: ObjectId,
  customer_id: ObjectId,
  appointment_date: Date,
  start_time: String,           // "09:00"
  end_time: String,             // "10:00"
  service_type: String,
  service_items: [{
    description: String,
    price: Number
  }],
  status: String,               // 'pending', 'confirmed', 'completed', 'cancelled'
  notes: String,
  reminder_sent: Boolean,
  created_at: Date
}
```

#### PosEmployee（扩展现有 User）
```javascript
{
  // 继承现有 User 模型的所有字段
  // 新增字段：
  employee_code: String,        // 员工编号
  role: String,                 // 'admin', 'cashier', 'inventory_manager', 'service_staff'
  pin_code: String,             // 快速登录 PIN（4-6 位数字，加密存储）
  active_status: String         // 'active', 'inactive'
}
```

#### TenantPosSettings（租户 POS 配置）
```javascript
{
  tenant_id: ObjectId,
  
  // 功能模块开关
  modules: {
    appointment: Boolean,       // 预约管理模块
    inventory: Boolean,         // 库存管理模块
    multi_cashier: Boolean,     // 多收银员管理
    customer_management: Boolean// 客户管理
  },
  
  // 业务类型
  business_type: String,        // 'retail', 'service', 'both'
  
  // 发票设置
  invoice_settings: {
    auto_create_on_payment: Boolean,    // 付款时自动创建发票
    default_invoice_type: String,       // '01' or '02'
    require_customer_for_invoice: Boolean
  },
  
  // 硬件设置
  hardware: {
    receipt_printer_enabled: Boolean,
    barcode_scanner_enabled: Boolean,
    cash_drawer_enabled: Boolean,
    label_printer_enabled: Boolean
  },
  
  updated_at: Date
}
```

### 3.2 新增 API 端点

#### 设备管理

**Web 后台（管理员）**
- `GET /api/v1/pos/devices` - 查看所有设备
- `POST /api/v1/pos/devices` - 生成配对码
- `PUT /api/v1/pos/devices/:id` - 更新设备信息
- `DELETE /api/v1/pos/devices/:id` - 停用设备

**POS App（设备配对）**
- `POST /api/v1/pos/devices/pair` - 配对设备
  - 请求: `{ pairing_code, device_info }`
  - 返回: `{ device_token, tenant_info, initial_data }`

#### POS 交易

- `POST /api/v1/pos/transactions` - 同步交易（支持批量）
- `GET /api/v1/pos/transactions` - 查询交易记录
- `POST /api/v1/pos/transactions/:id/refund` - 退款

#### POS 商品和库存

- `GET /api/v1/pos/products` - 获取商品列表（支持条码搜索）
- `POST /api/v1/pos/products` - 新增商品
- `PUT /api/v1/pos/products/:id` - 更新商品
- `POST /api/v1/pos/inventory/adjust` - 库存调整
- `POST /api/v1/pos/inventory/restock` - 进货
- `GET /api/v1/pos/inventory/logs` - 库存日志

#### 预约管理（可选模块）

- `GET /api/v1/pos/appointments` - 查询预约
- `POST /api/v1/pos/appointments` - 创建预约
- `PUT /api/v1/pos/appointments/:id` - 更新预约
- `DELETE /api/v1/pos/appointments/:id` - 取消预约

#### 员工管理

- `POST /api/v1/pos/employees/pin-login` - PIN 码快速登录
- `GET /api/v1/pos/employees` - 员工列表

#### POS 设置

- `GET /api/v1/pos/settings` - 获取 POS 配置
- `PUT /api/v1/pos/settings` - 更新 POS 配置

### 3.3 发票创建流程（调整）

**重要变更**: 付款时立即创建发票，而非批量生成

#### 流程

1. **POS 收银完成（付款成功）**
   - 创建 PosTransaction（本地 SQLite）
   - **同时调用 API 创建 Invoice**
   - Invoice 初始状态: `draft`

2. **Invoice 创建 API**
   ```javascript
   POST /api/v1/invoices
   {
     source: 'pos',
     pos_transaction_id: 'uuid',
     invoice_type: '02',        // 简化发票（B2C）或 '01'（B2B）
     customer_id: 'xxx' or null,
     issue_date: '2026-05-19',
     items: [...],
     payment_method: 'cash',
     status: 'draft'            // 关键：初始为草稿
   }
   ```

3. **提交到 LHDN（用户控制）**
   - **手动提交**: Web 后台选择发票 → "提交到 LHDN"
   - **批量提交**: 复用现有的自动批量上传功能
     - 设置: 每天 23:00 自动提交所有 `draft` 状态发票
     - 或手动选择日期范围批量提交

#### 发票状态流转

```
draft (POS 创建) 
  → validated (可选，用户验证)
  → submitted (提交到 LHDN)
  → accepted/rejected (LHDN 响应)
```

#### Web 后台功能扩展

**发票列表页面新增**:
- 筛选器: "来源"（手动/POS）
- 筛选器: "状态"（草稿/已提交/已接受）
- 批量操作: 选择多张发票 → "提交到 LHDN"

## 4. POS App 系统设计

### 4.1 技术栈

**核心框架**
- Flutter 3.x（跨平台）
- Dart 3.x
- 状态管理: Riverpod 或 Bloc
- 本地数据库: sqflite（SQLite）
- 网络请求: dio + retrofit
- 本地存储: shared_preferences（配置）、flutter_secure_storage（token）

**硬件集成**
- 蓝牙打印机: `flutter_blue_plus` + `esc_pos_utils`
- USB 设备: `usb_serial` 或 `flutter_libserialport`
- 条码扫描: `flutter_barcode_scanner` 或硬件扫描枪（键盘模式）
- 相机扫描: `mobile_scanner`（配对二维码）

### 4.2 本地数据库结构（SQLite）

```sql
-- 设备配置
CREATE TABLE device_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 本地交易
CREATE TABLE local_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT,
  transaction_date INTEGER,
  cashier_id TEXT,
  customer_id TEXT,
  items_json TEXT,
  subtotal REAL,
  tax_amount REAL,
  total_amount REAL,
  payment_method TEXT,
  synced INTEGER DEFAULT 0,
  created_at INTEGER
);

-- 商品缓存
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT,
  barcode TEXT,
  price REAL,
  cost_price REAL,
  tax_type TEXT,
  tax_rate REAL,
  stock_quantity INTEGER,
  reorder_level INTEGER,
  batch_number TEXT,
  expiry_date INTEGER,
  updated_at INTEGER
);

-- 客户缓存
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  customer_type TEXT,
  updated_at INTEGER
);

-- 预约（可选模块）
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  appointment_date INTEGER,
  start_time TEXT,
  end_time TEXT,
  service_type TEXT,
  service_items_json TEXT,
  status TEXT,
  synced INTEGER DEFAULT 0,
  created_at INTEGER
);

-- 同步队列
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  action TEXT,
  payload_json TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 10,
  next_retry_at INTEGER,
  error_message TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER
);

-- 库存日志（可选模块）
CREATE TABLE inventory_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT,
  transaction_type TEXT,
  quantity_change INTEGER,
  reference_id TEXT,
  created_at INTEGER
);
```

### 4.3 核心功能模块

#### A. 收银模块
- 商品搜索（名称/条码）
- 购物车管理（添加/删除/修改数量）
- 实时计算（小计/税额/总计）
- 多种支付方式（现金/卡/电子钱包）
- 打印收据
- 快速结账（常用商品快捷键）

#### B. 库存模块（可选）
- 商品列表（搜索、筛选）
- 库存查询（实时库存、批次、过期日期）
- 进货录入（批量导入或手动）
- 库存调整（盘点、损耗）
- 库存预警（低于补货线提醒）

#### C. 预约模块（可选）
- 日历视图（查看预约）
- 创建预约（选择客户、服务、时间）
- 预约提醒（本地通知）
- 预约转销售（完成服务后直接结账）

#### D. 员工模块
- PIN 码登录（4-6 位数字）
- 权限控制（收银/库存/预约/报表）
- 交班记录（每个收银员的销售额）

#### E. 同步模块
- 后台自动同步（网络可用时）
- 增量同步（只同步变更数据）
- 冲突处理（服务器数据优先）
- 同步状态显示（最后同步时间、待同步数量）

#### F. 报表模块（本地）
- 今日销售汇总
- 收银员销售明细
- 热销商品排行
- 库存状况报表

### 4.4 设备配对流程

#### Web 管理后台（生成配对码）

1. 管理员进入"POS 管理" → "设备管理"
2. 点击"添加新设备"
3. 输入设备名称（如"收银台1"）
4. 系统生成 6 位配对码（如 `A1B2C3`）
5. 显示配对码和二维码（15 分钟有效）

#### POS App（设备配对）

1. 首次启动显示"设备配对"界面
2. 两种配对方式：
   - 扫描二维码（推荐）
   - 手动输入 6 位配对码
3. 输入后调用 `POST /api/v1/pos/devices/pair`
4. 验证成功后：
   - 获取设备专用 token（30 天有效）
   - 下载初始数据（商品、客户、配置）
   - 保存到本地 SQLite
   - 进入 POS 主界面

#### 安全机制

1. **配对码限制**：
   - 6 位字母数字组合
   - 15 分钟有效期
   - 只能使用一次
   - 配对成功后立即失效

2. **设备 Token**：
   - 长期有效的 JWT token（30 天）
   - 包含 device_id 和 tenant_id
   - 可在 Web 后台远程撤销

3. **设备状态监控**：
   - 显示最后同步时间
   - 超过 24 小时未同步显示警告
   - 可远程停用设备

## 5. 数据同步机制

### 5.1 同步类型

#### 实时同步（优先级高）
- POS 交易 + 发票创建（付款完成时）
- 库存扣减（销售时）
- 预约创建/更新

#### 定时同步（优先级中）
- 商品数据下载（每小时）
- 客户数据下载（每小时）
- 库存数据下载（每 30 分钟）

#### 按需同步（优先级低）
- 历史交易查询
- 报表数据

### 5.2 离线队列机制

**队列处理逻辑**:
1. 检查网络连接
2. 获取待同步项目（按优先级和创建时间排序）
3. 逐个处理（每次最多 50 条）
4. 成功：标记为 success
5. 失败：增加重试次数，使用指数退避策略
   - 重试间隔: 2^n 分钟（1, 2, 4, 8, 16...）
   - 最大重试: 10 次
   - 超过最大重试：标记为 failed，通知用户

### 5.3 冲突处理策略

#### 商品数据冲突
- **规则**: 服务器数据优先（Server Wins）
- **原因**: 商品信息通常在 Web 后台统一管理
- **处理**: 用服务器数据覆盖本地（基于 updated_at 时间戳）

#### 库存数据冲突
- **规则**: 服务器数据优先，但记录差异
- **处理**: 
  1. 更新本地库存为服务器值
  2. 记录差异日志
  3. 如果差异大（>10），提醒用户盘点

#### 交易数据冲突
- **规则**: 不会冲突（只创建，不修改）
- **唯一性**: 使用 UUID 作为 transaction_id
- **幂等性**: 服务器端检查 transaction_id，重复提交返回原记录

#### 客户数据冲突
- **规则**: 服务器数据优先
- **原因**: 客户信息可能在多个设备或 Web 后台修改

### 5.4 数据完整性保证

**事务性操作**（POS 收银完成时）:
```dart
await db.transaction((txn) async {
  // 1. 创建本地交易记录
  final transactionId = await txn.insert('local_transactions', transaction);
  
  // 2. 扣减本地库存
  for (final item in transaction.items) {
    await txn.rawUpdate(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [item.quantity, item.productId]
    );
  }
  
  // 3. 添加到同步队列（交易 + 发票）
  await txn.insert('sync_queue', {
    'entity_type': 'transaction_with_invoice',
    'action': 'create',
    'payload_json': jsonEncode({
      'transaction': transaction.toJson(),
      'invoice': invoice.toJson()
    })
  });
  
  // 4. 记录库存变动日志
  for (final item in transaction.items) {
    await txn.insert('inventory_log', {
      'product_id': item.productId,
      'transaction_type': 'sale',
      'quantity_change': -item.quantity,
      'reference_id': transactionId
    });
  }
});
```

### 5.5 同步状态 UI

**状态指示器（顶部栏）**:
- 🟢 已同步（最后同步：2 分钟前）
- 🟡 同步中（3/10 项）
- 🔴 离线模式（待同步：25 项）
- ⚠️ 同步失败（5 项失败，点击查看）

**同步详情页面**:
- 待同步项目列表
- 失败项目列表（可重试或删除）
- 同步历史记录
- 手动触发完整同步按钮

## 6. 硬件集成

### 6.1 收据打印机

**支持的连接方式**:
- 蓝牙打印机（推荐）
- USB 打印机（桌面版）
- 网络打印机（WiFi/Ethernet）

**打印内容**:
- 店铺信息（名称、地址）
- 交易信息（收据号、日期、收银员）
- 商品明细（名称、数量、单价、小计）
- 总计（小计、税额、总额）
- 支付方式
- 感谢语

**打印机设置界面**:
- 搜索可用打印机
- 测试打印（打印测试页）
- 设置默认打印机
- 打印份数设置（1-3 份）

### 6.2 条码扫描枪

**两种模式**:

1. **硬件扫描枪（键盘输入模式）**
   - 扫描枪模拟键盘输入
   - 自动填充到搜索框
   - 检测快速连续输入（扫描枪特征）
   - 自动搜索商品并添加到购物车

2. **相机扫描**
   - 使用设备相机扫描条码
   - 适用于没有硬件扫描枪的情况

### 6.3 收银机钱箱

- 通过打印机指令打开钱箱
- ESC/POS 开钱箱指令
- 收银完成后自动打开（可配置）

### 6.4 刷卡机/支付终端

- 集成第三方支付 SDK（iPay88, Senangpay 等）
- 支持信用卡/借记卡
- 支持电子钱包（Touch 'n Go, GrabPay 等）
- 返回交易 ID 和支付方式

## 7. 错误处理和恢复

### 7.1 网络错误

**策略**:
- 自动重试（最多 3 次）
- 指数退避（1s, 2s, 4s）
- 失败后加入离线队列
- 显示友好错误信息

### 7.2 硬件错误

**打印机错误**:
- 未连接：提示检查连接，提供重试/跳过/重新搜索选项
- 缺纸：提示添加打印纸，提供重试/跳过选项
- 其他错误：显示错误信息，提供跳过选项
- 所有错误记录到日志

**扫描枪错误**:
- 无法识别条码：提示手动输入或使用相机扫描
- 商品不存在：提示添加新商品

**支付终端错误**:
- 支付失败：显示失败原因，允许重试或更换支付方式
- 超时：提示检查网络，允许重试

### 7.3 数据错误

**同步冲突**:
- 显示冲突详情
- 提供选择：使用服务器数据 / 使用本地数据
- 记录冲突日志

**数据验证失败**:
- 显示验证错误信息
- 标记为失败，不再重试
- 记录到错误日志

### 7.4 交易错误恢复

**应用崩溃恢复**:
- 启动时检查未完成的交易
- 提示用户：继续 / 取消
- 恢复购物车状态

**断电恢复**:
- 所有交易数据持久化到 SQLite
- 重启后自动恢复

## 8. Web 管理后台扩展

### 8.1 新增页面：POS 管理

#### 设备管理标签页
- 设备列表（名称、状态、最后同步时间）
- 添加设备按钮（生成配对码和二维码）
- 停用设备按钮
- 设备详情（查看设备信息、同步历史）

#### 交易记录标签页
- 交易列表（日期、流水号、金额、收银员、发票状态）
- 筛选器：
  - 日期范围
  - 收银员
  - 是否已开票
  - 支付方式
- 导出 Excel
- 查看交易详情

#### 库存总览标签页
- 所有商品库存状况
- 低库存预警列表
- 库存变动日志
- 库存调整功能

#### POS 设置标签页
- 功能模块开关（预约、库存、多收银员等）
- 业务类型选择（零售/服务/混合）
- 发票设置（自动创建、默认类型等）
- 硬件设置（打印机、扫描枪等）

### 8.2 发票列表页面扩展

**新增筛选器**:
- 来源：手动 / POS
- 状态：草稿 / 已提交 / 已接受 / 已拒绝

**新增批量操作**:
- 选择多张发票 → "提交到 LHDN"
- 批量导出 PDF

**POS 发票标识**:
- 显示 POS 图标
- 显示关联的交易号
- 显示收银员信息

## 9. 模块化功能设计

### 9.1 功能开关机制

**目的**: 不同业务类型需要不同功能，通过开关控制

**可选模块**:
- 预约管理（服务业需要，零售业不需要）
- 库存管理（大部分需要）
- 多收银员管理（单人店铺可能不需要）
- 客户管理（B2B 需要，B2C 可选）

### 9.2 动态界面

**POS App 启动时**:
1. 从服务器加载配置（`GET /api/v1/pos/settings`）
2. 缓存到本地
3. 根据配置动态显示/隐藏功能模块
4. 条件性创建数据库表

**配置变更**:
- 管理员在 Web 后台修改配置
- 设备下次同步时自动获取新配置
- 显示通知："系统配置已更新，请重启应用"

### 9.3 数据库优化

**条件性创建表**:
- 核心表（始终创建）：transactions, products, sync_queue
- 可选表（根据配置）：appointments, inventory_log, customers

**条件性同步**:
- 只同步已启用模块的数据
- 减少网络流量和存储空间

## 10. 安全性考虑

### 10.1 认证和授权

**设备认证**:
- 配对码机制（6 位，15 分钟有效，一次性）
- 设备专用 JWT token（30 天有效）
- 可远程撤销设备访问权限

**用户认证**:
- PIN 码快速登录（4-6 位数字）
- PIN 码加密存储（bcrypt）
- 支持完整登录（用户名 + 密码）

**权限控制**:
- 角色：admin, cashier, inventory_manager, service_staff
- 细分权限：收银、库存管理、预约管理、报表查看、设置修改

### 10.2 数据安全

**传输安全**:
- 所有 API 调用使用 HTTPS
- JWT token 包含在 Authorization header

**本地数据安全**:
- 敏感数据加密存储（device_token, PIN）
- 使用 flutter_secure_storage

**数据隔离**:
- 租户级别隔离（tenant_id）
- 设备只能访问自己租户的数据

### 10.3 审计日志

**记录内容**:
- 所有交易操作（创建、退款）
- 库存变动（进货、销售、调整）
- 设备配对和停用
- 配置变更
- 登录/登出

**日志保留**:
- 本地日志：30 天
- 服务器日志：永久保留

## 11. 性能优化

### 11.1 本地性能

**数据库优化**:
- 为常用查询字段添加索引（barcode, transaction_date, customer_id）
- 定期清理旧数据（已同步的交易保留 90 天）
- 使用批量插入减少 I/O

**UI 性能**:
- 商品列表虚拟滚动（只渲染可见项）
- 图片懒加载和缓存
- 防抖搜索（300ms）

**启动优化**:
- 配置缓存（避免每次启动请求）
- 延迟加载非核心模块
- 后台预加载常用数据

### 11.2 网络性能

**减少请求**:
- 批量同步（最多 50 条/次）
- 增量同步（只同步变更数据）
- 压缩请求和响应（gzip）

**请求优化**:
- 超时设置（30 秒）
- 并发限制（最多 3 个并发请求）
- 请求优先级（交易 > 库存 > 报表）

### 11.3 存储优化

**本地存储**:
- 定期清理同步队列（已成功的项目）
- 压缩日志文件
- 限制缓存大小（最多 500MB）

**服务器存储**:
- POS 交易数据定期归档（1 年后）
- 图片使用 CDN
- 数据库索引优化

## 12. 实施计划

### 12.1 第一阶段：后端扩展（2-3 周）

**任务**:
1. 新增数据模型（PosDevice, PosTransaction, PosProduct 等）
2. 实现设备管理 API（配对、查询、停用）
3. 实现 POS 交易 API（创建、同步、查询）
4. 实现 POS 商品和库存 API
5. 扩展 Invoice 模型（支持 POS 来源）
6. 实现 POS 设置 API
7. 单元测试和集成测试

### 12.2 第二阶段：POS App 核心功能（3-4 周）

**任务**:
1. 项目搭建和架构设计
2. 本地数据库设计和实现
3. 设备配对功能
4. 收银模块（商品搜索、购物车、结账）
5. 同步模块（离线队列、冲突处理）
6. 员工管理（PIN 登录、权限控制）
7. 基础 UI 和导航

### 12.3 第三阶段：硬件集成（2 周）

**任务**:
1. 蓝牙打印机集成
2. 条码扫描枪集成
3. 收银机钱箱集成
4. 支付终端集成（可选）
5. 硬件错误处理

### 12.4 第四阶段：可选模块（2-3 周）

**任务**:
1. 库存管理模块
2. 预约管理模块
3. 报表模块
4. 模块化配置系统

### 12.5 第五阶段：Web 后台扩展（1-2 周）

**任务**:
1. POS 管理页面（设备、交易、库存、设置）
2. 发票列表页面扩展（POS 筛选、批量操作）
3. 报表和统计

### 12.6 第六阶段：测试和优化（2 周）

**任务**:
1. 端到端测试
2. 离线场景测试
3. 硬件兼容性测试
4. 性能优化
5. 用户验收测试（UAT）

**总计**: 约 12-16 周

## 13. 风险和挑战

### 13.1 技术风险

**离线同步复杂性**:
- **风险**: 数据冲突、同步失败、数据丢失
- **缓解**: 完善的冲突处理策略、重试机制、本地持久化

**硬件兼容性**:
- **风险**: 不同品牌打印机/扫描枪的兼容性问题
- **缓解**: 支持标准协议（ESC/POS）、提供硬件兼容性列表、充分测试

**性能问题**:
- **风险**: 大量数据导致 App 卡顿
- **缓解**: 数据分页、虚拟滚动、定期清理、性能监控

### 13.2 业务风险

**用户学习曲线**:
- **风险**: 用户不熟悉新系统，影响收银效率
- **缓解**: 简洁的 UI 设计、用户培训、操作手册

**网络依赖**:
- **风险**: 虽然支持离线，但长期离线可能导致问题
- **缓解**: 离线状态明确提示、同步状态可视化、手动同步功能

**数据安全**:
- **风险**: 设备丢失或被盗导致数据泄露
- **缓解**: 本地数据加密、远程停用设备、定期备份

### 13.3 扩展性风险

**单体架构限制**:
- **风险**: 未来扩展到多店铺时可能遇到性能瓶颈
- **缓解**: 设计时考虑未来拆分、使用租户隔离、监控性能指标

**硬件限制**:
- **风险**: 平板/手机性能不足
- **缓解**: 最低硬件要求说明、性能优化、支持桌面版

## 14. 成功指标

### 14.1 技术指标

- 离线操作成功率 > 99%
- 同步成功率 > 95%
- App 启动时间 < 3 秒
- 收银操作响应时间 < 500ms
- 崩溃率 < 0.1%

### 14.2 业务指标

- 用户满意度 > 4.5/5
- 每日活跃设备数
- 平均交易处理时间
- 发票提交成功率 > 98%
- 用户培训时间 < 2 小时

## 15. 未来扩展

### 15.1 短期（6 个月内）

- 会员积分系统
- 促销和折扣管理
- 多店铺支持（连锁店）
- 移动端管理 App（店长查看报表）

### 15.2 长期（1 年内）

- AI 销售预测
- 智能补货建议
- 客户行为分析
- 与会计系统集成（Xero, QuickBooks）
- 供应商管理

---

## 附录 A：技术栈总结

### 后端（扩展现有系统）
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Redis + Bull Queue
- JWT 认证

### POS App
- Flutter 3.x + Dart 3.x
- SQLite (sqflite)
- Riverpod/Bloc（状态管理）
- dio + retrofit（网络）
- flutter_secure_storage（安全存储）

### 硬件集成
- flutter_blue_plus（蓝牙）
- esc_pos_utils（打印）
- mobile_scanner（扫码）

## 附录 B：关键文件清单

### 后端新增文件
- `src/models/PosDevice.ts`
- `src/models/PosTransaction.ts`
- `src/models/PosInventoryLog.ts`
- `src/models/PosAppointment.ts`
- `src/models/TenantPosSettings.ts`
- `src/routes/pos/devices.ts`
- `src/routes/pos/transactions.ts`
- `src/routes/pos/products.ts`
- `src/routes/pos/inventory.ts`
- `src/routes/pos/appointments.ts`
- `src/routes/pos/settings.ts`

### POS App 核心文件
- `lib/models/` - 数据模型
- `lib/services/database_service.dart` - SQLite 管理
- `lib/services/sync_service.dart` - 同步服务
- `lib/services/api_service.dart` - API 调用
- `lib/services/printer_service.dart` - 打印服务
- `lib/screens/cashier/` - 收银界面
- `lib/screens/inventory/` - 库存界面
- `lib/screens/appointments/` - 预约界面
- `lib/screens/settings/` - 设置界面

---

**文档结束**

