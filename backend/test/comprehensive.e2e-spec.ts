import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as supertest from 'supertest';
import { TestAppModule } from './test-app.module';
import { ValidationPipe } from '@nestjs/common';

// ============================================================
// Set env BEFORE module load
// ============================================================
process.env.DB_TYPE = 'sqljs';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

// ============================================================
// Global test variables
// ============================================================
let app: INestApplication;
let httpServer: any;
let client: any;
let customerToken = '';
let workerToken = '';
let adminToken = '';
let customerUserId = 0;
let workerUserId = 0;
let adminUserId = 0;
let orderId = 0;
let couponId = 0;
let addressId = 0;
let ticketId = 0;
let bannerId = 0;
let mallItemId = 0;

// ============================================================
// Test Setup
// ============================================================
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  httpServer = app.getHttpServer();
  client = supertest(httpServer);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

// Helper: make authenticated request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function auth(token: string): any {
  return {
    get: (url: string) => client.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => client.post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => client.patch(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => client.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => client.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// ============================================================
// 1. SYSTEM TESTS
// ============================================================
describe('=== 1. System Endpoints ===', () => {
  it('GET / should return service info', () => {
    return client
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('name', 'Family Home Service');
      });
  });

  it('GET /health should return ok', () => {
    return client.get('/health').expect(200);
  });
});

// ============================================================
// 2. AUTH TESTS
// ============================================================
describe('=== 2. Auth Module ===', () => {
  it('POST /auth/register - register customer', async () => {
    const res = await client
      .post('/auth/register')
      .send({ phone: '13800000001', password: 'password123', role: 'customer' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('phone', '13800000001');
    customerToken = res.body.access_token;
    customerUserId = res.body.user.id;
  });

  it('POST /auth/register - register worker', async () => {
    const res = await client
      .post('/auth/register')
      .send({ phone: '13800000002', password: 'password123', role: 'worker' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
    workerToken = res.body.access_token;
    workerUserId = res.body.user.id;
  });

  it('POST /auth/register - register admin', async () => {
    const res = await client
      .post('/auth/register')
      .send({ phone: '13800000003', password: 'password123', role: 'admin' })
      .expect(201);
    adminToken = res.body.access_token;
    adminUserId = res.body.user.id;
  });

  it('POST /auth/register - duplicate phone should fail', () => {
    return client
      .post('/auth/register')
      .send({ phone: '13800000001', password: 'password123' })
      .expect(400);
  });

  it('POST /auth/login - customer login with password', async () => {
    const res = await client
      .post('/auth/login')
      .send({ phone: '13800000001', password: 'password123' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
    customerToken = res.body.access_token;
  });

  it('POST /auth/login - wrong password should fail', () => {
    return client
      .post('/auth/login')
      .send({ phone: '13800000001', password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /auth/login - login with SMS code (demo 123456)', async () => {
    const res = await client
      .post('/auth/login')
      .send({ phone: '13800000001', type: 'sms', code: '123456' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
  });

  it('POST /auth/send-code should return mock code', () => {
    return client
      .post('/auth/send-code')
      .send({ phone: '13800000001' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('code', '123456');
      });
  });

  it('GET /auth/profile should return user profile', () => {
    return auth(customerToken)
      .get('/auth/profile')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('phone', '13800000001');
      });
  });

  it('PATCH /auth/roles should switch roles', async () => {
    const res = await auth(customerToken)
      .patch('/auth/roles')
      .send({ roles: ['customer', 'worker'] })
      .expect(200);
    expect(res.body).toHaveProperty('access_token');
    customerToken = res.body.access_token;
  });

  it('PATCH /auth/location should update GPS', () => {
    return auth(customerToken)
      .patch('/auth/location')
      .send({ lat: 39.9042, lng: 116.4074 })
      .expect(200);
  });

  it('GET /auth/users (admin) should return all users', () => {
    return auth(adminToken)
      .get('/auth/users')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
      });
  });

  it('GET /auth/dev-admin-token should return admin token (dev only)', () => {
    return client
      .get('/auth/dev-admin-token')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('token');
      });
  });
});

// ============================================================
// 3. USERS TESTS
// ============================================================
describe('=== 3. Users Module ===', () => {
  it('GET /users/worker/:id should return worker info', () => {
    return client
      .get(`/users/worker/${workerUserId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', workerUserId);
      });
  });
});

// ============================================================
// 4. SERVICE CATEGORIES TESTS
// ============================================================
describe('=== 4. Service Categories ===', () => {
  let categoryId = 0;

  it('POST /service-categories - create category', async () => {
    const res = await auth(adminToken)
      .post('/service-categories')
      .send({ name: '日常保洁', icon: 'clean', basePrice: 50, unit: 'hour', description: '家庭日常清洁' })
      .expect(201);
    categoryId = res.body.id;
    expect(res.body).toHaveProperty('name', '日常保洁');
  });

  it('GET /service-categories should return categories', () => {
    return client
      .get('/service-categories')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
      });
  });

  it('PATCH /service-categories/:id should update category', () => {
    return auth(adminToken)
      .patch(`/service-categories/${categoryId}`)
      .send({ description: 'Updated description' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('description', 'Updated description');
      });
  });
});

// ============================================================
// 5. ORDERS TESTS
// ============================================================
describe('=== 5. Orders Module ===', () => {
  it('POST /orders - create order', async () => {
    const res = await auth(customerToken)
      .post('/orders')
      .send({
        serviceType: '日常保洁',
        serviceTime: '2026-04-10T10:00:00Z',
        location: '北京市朝阳区',
        addressDetail: 'XX小区1号楼',
        contactPhone: '13800000001',
        amount: 150,
      })
      .expect(201);
    orderId = res.body.id;
    expect(res.body).toHaveProperty('orderNo');
    expect(res.body).toHaveProperty('status', 0);
  });

  it('GET /orders/my should return customer orders', () => {
    return auth(customerToken)
      .get('/orders/my')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
      });
  });

  it('GET /orders/pending should return pending orders', () => {
    return auth(workerToken)
      .get('/orders/pending')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /orders/:id should return order detail', () => {
    return auth(customerToken)
      .get(`/orders/${orderId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', orderId);
      });
  });

  it('POST /orders/:id/grab - worker grabs order', () => {
    return auth(workerToken)
      .post(`/orders/${orderId}/grab`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 1);
      });
  });

  it('PATCH /orders/:id/depart - worker departs', () => {
    return auth(workerToken)
      .patch(`/orders/${orderId}/depart`)
      .expect(200);
  });

  it('PATCH /orders/:id/arrive - worker arrives', () => {
    return auth(workerToken)
      .patch(`/orders/${orderId}/arrive`)
      .send({ lat: 39.9042, lng: 116.4074 })
      .expect(200);
  });

  it('PATCH /orders/:id/start - start service', () => {
    return auth(workerToken)
      .patch(`/orders/${orderId}/start`)
      .expect(200);
  });

  it('PATCH /orders/:id/complete - complete service', () => {
    return auth(workerToken)
      .patch(`/orders/${orderId}/complete`)
      .send({ score: 5, content: 'Service completed' })
      .expect(200);
  });

  it('POST /orders - create second order', async () => {
    const res = await auth(customerToken)
      .post('/orders')
      .send({
        serviceType: '日常保洁',
        serviceTime: '2026-04-11T14:00:00Z',
        location: '北京市海淀区',
        amount: 200,
      })
      .expect(201);
    expect(res.body).toHaveProperty('status', 0);
  });

  it('GET /orders/admin/all (admin) should return all orders', () => {
    return auth(adminToken)
      .get('/orders/admin/all')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
      });
  });
});

// ============================================================
// 6. TRANSACTIONS / CONFIG TESTS
// ============================================================
describe('=== 6. Transactions & Config ===', () => {
  it('GET /config/commission_rate should return commission rate', () => {
    return client
      .get('/config/commission_rate')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('value');
      });
  });

  it('GET /config/banners/active should return banners', () => {
    return client.get('/config/banners/active').expect(200);
  });

  it('POST /config/banners (admin) - create banner', async () => {
    const res = await auth(adminToken)
      .post('/config/banners')
      .send({ title: 'Test Banner', imageUrl: 'https://example.com/banner.jpg', sortOrder: 1 })
      .expect(201);
    bannerId = res.body.id;
    expect(res.body).toHaveProperty('title', 'Test Banner');
  });

  it('GET /config/banners/all (admin) should return banners', () => {
    return auth(adminToken)
      .get('/config/banners/all')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('PATCH /config/banners/:id (admin) - update banner', () => {
    return auth(adminToken)
      .patch(`/config/banners/${bannerId}`)
      .send({ title: 'Updated Banner' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('title', 'Updated Banner');
      });
  });

  it('DELETE /config/banners/:id (admin) - delete banner', () => {
    return auth(adminToken).delete(`/config/banners/${bannerId}`).expect(200);
  });

  it('GET /transactions/my should return transactions', () => {
    return auth(customerToken)
      .get('/transactions/my')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /transactions/wallet should return wallet info', () => {
    return auth(workerToken)
      .get('/transactions/wallet')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('balance');
      });
  });

  it('POST /config/commission_rate (admin) - set rate', () => {
    return auth(adminToken)
      .post('/config/commission_rate')
      .send({ value: 0.1 })
      .expect(200);
  });

  it('GET /config/stats (admin) should return stats', () => {
    return auth(adminToken).get('/config/stats').expect(200);
  });
});

// ============================================================
// 7. PAYMENT TESTS
// ============================================================
describe('=== 7. Payment Module ===', () => {
  it('POST /transactions/alipay/notify-mock should handle mock payment', () => {
    return client
      .post('/transactions/alipay/notify-mock')
      .send({ out_trade_no: 'ORD_test_123' })
      .expect(200);
  });
});

// ============================================================
// 8. WITHDRAWALS TESTS
// ============================================================
describe('=== 8. Withdrawals Module ===', () => {
  it('POST /withdrawals - create withdrawal request', () => {
    return auth(workerToken)
      .post('/withdrawals')
      .send({ amount: 50, method: 'wechat', accountInfo: 'wechat_account_123' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('amount', 50);
      });
  });

  it('GET /withdrawals/admin/all (admin) should return all withdrawals', () => {
    return auth(adminToken)
      .get('/withdrawals/admin/all')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});

// ============================================================
// 9. ADDRESSES TESTS
// ============================================================
describe('=== 9. Addresses Module ===', () => {
  it('POST /addresses - create address', async () => {
    const res = await auth(customerToken)
      .post('/addresses')
      .send({
        name: '张三',
        phone: '13800000001',
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        location: 'XX小区',
        addressDetail: '1号楼101',
        isDefault: true,
      })
      .expect(201);
    addressId = res.body.id;
    expect(res.body).toHaveProperty('name', '张三');
  });

  it('GET /addresses should return addresses', () => {
    return auth(customerToken)
      .get('/addresses')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
      });
  });

  it('GET /addresses/:id should return single address', () => {
    return auth(customerToken)
      .get(`/addresses/${addressId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', addressId);
      });
  });

  it('PATCH /addresses/:id should update address', () => {
    return auth(customerToken)
      .patch(`/addresses/${addressId}`)
      .send({ name: '李四' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('name', '李四');
      });
  });

  it('PATCH /addresses/:id/default should set as default', () => {
    return auth(customerToken)
      .patch(`/addresses/${addressId}/default`)
      .expect(200);
  });

  it('DELETE /addresses/:id should delete address', () => {
    return auth(customerToken).delete(`/addresses/${addressId}`).expect(200);
  });
});

// ============================================================
// 10. COUPONS TESTS
// ============================================================
describe('=== 10. Coupons Module ===', () => {
  it('GET /coupons/active should return active coupons', async () => {
    const res = await auth(customerToken).get('/coupons/active').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      couponId = res.body[0].id;
    }
  });

  it('POST /coupons/claim should claim coupon', () => {
    if (!couponId) return;
    return auth(customerToken)
      .post('/coupons/claim')
      .send({ couponId })
      .expect(201);
  });

  it('GET /coupons/my should return my coupons', () => {
    return auth(customerToken)
      .get('/coupons/my')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /coupons/applicable?amount=100 should return applicable coupons', () => {
    return auth(customerToken)
      .get('/coupons/applicable?amount=100')
      .expect(200);
  });
});

// ============================================================
// 11. CHAT TESTS
// ============================================================
describe('=== 11. Chat Module ===', () => {
  it('GET /chat/contacts should return contacts', () => {
    return auth(customerToken)
      .get('/chat/contacts')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /chat/history/:contactId should return chat history', () => {
    return auth(customerToken)
      .get(`/chat/history/${workerUserId}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});

// ============================================================
// 12. RATINGS TESTS
// ============================================================
describe('=== 12. Ratings Module ===', () => {
  it('GET /ratings/worker/:id should return worker ratings', () => {
    return auth(customerToken)
      .get(`/ratings/worker/${workerUserId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
      });
  });

  it('GET /ratings/user/:id should return user ratings', () => {
    return auth(workerToken)
      .get(`/ratings/user/${workerUserId}`)
      .expect(200);
  });
});

// ============================================================
// 13. NOTIFICATIONS TESTS
// ============================================================
describe('=== 13. Notifications Module ===', () => {
  it('GET /notifications should return notifications', () => {
    return auth(customerToken)
      .get('/notifications')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /notifications/unread-count should return count', () => {
    return auth(customerToken)
      .get('/notifications/unread-count')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('count');
      });
  });

  it('POST /notifications/read-all should mark all as read', () => {
    return auth(customerToken).post('/notifications/read-all').expect(200);
  });

  it('GET /notifications/preferences should return preferences', () => {
    return auth(customerToken)
      .get('/notifications/preferences')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('inAppEnabled');
      });
  });

  it('PATCH /notifications/preferences should update preferences', () => {
    return auth(customerToken)
      .patch('/notifications/preferences')
      .send({ orderNoticeEnabled: 0 })
      .expect(200);
  });

  it('POST /notifications/test-send should send test notification', () => {
    return auth(customerToken)
      .post('/notifications/test-send')
      .send({ title: 'Test', content: 'Test notification', type: 'system' })
      .expect(200);
  });
});

// ============================================================
// 14. SUPPORT TESTS
// ============================================================
describe('=== 14. Support Module ===', () => {
  it('POST /support/tickets - create support ticket', async () => {
    const res = await auth(customerToken)
      .post('/support/tickets')
      .send({ title: 'Test Ticket', description: 'This is a test ticket' })
      .expect(201);
    ticketId = res.body.id;
    expect(res.body).toHaveProperty('title', 'Test Ticket');
  });

  it('GET /support/my-tickets should return my tickets', () => {
    return auth(customerToken)
      .get('/support/my-tickets')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /support/ai-chat should return AI response', () => {
    return client
      .post('/support/ai-chat')
      .send({ message: 'How do I cancel an order?', userId: customerUserId })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('reply');
      });
  });

  it('GET /support/admin/all (admin) should return all tickets', () => {
    return auth(adminToken)
      .get('/support/admin/all')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('PATCH /support/admin/tickets/:id (admin) - update ticket', () => {
    return auth(adminToken)
      .patch(`/support/admin/tickets/${ticketId}`)
      .send({ status: 2, adminReply: '已处理' })
      .expect(200);
  });
});

// ============================================================
// 15. FILES TESTS
// ============================================================
describe('=== 15. Files Module ===', () => {
  it('POST /files/upload - upload file', () => {
    return auth(customerToken)
      .post('/files/upload')
      .attach('file', Buffer.from('test content'), 'test.txt')
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('url');
      });
  });
});

// ============================================================
// 16. ANALYTICS TESTS
// ============================================================
describe('=== 16. Analytics Module ===', () => {
  it('GET /analytics/admin/overview should return overview', () => {
    return auth(adminToken)
      .get('/analytics/admin/overview')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('usersTotal');
        expect(res.body).toHaveProperty('ordersTotal');
      });
  });

  it('GET /analytics/admin/order-trend should return trend', () => {
    return auth(adminToken)
      .get('/analytics/admin/order-trend?days=7')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /analytics/admin/finance-trend should return finance trend', () => {
    return auth(adminToken)
      .get('/analytics/admin/finance-trend?days=7')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /analytics/admin/refund-summary should return refund summary', () => {
    return auth(adminToken).get('/analytics/admin/refund-summary').expect(200);
  });

  it('GET /analytics/admin/worker-income-top should return top workers', () => {
    return auth(adminToken)
      .get('/analytics/admin/worker-income-top?days=30&limit=10')
      .expect(200);
  });

  it('GET /analytics/admin/export/overview should export CSV', () => {
    return auth(adminToken).get('/analytics/admin/export/overview').expect(200);
  });
});

// ============================================================
// 17. MEMBERSHIP TESTS
// ============================================================
describe('=== 17. Membership Module ===', () => {
  it('GET /membership/me should return membership profile', () => {
    return auth(customerToken)
      .get('/membership/me')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('level');
        expect(res.body).toHaveProperty('points');
      });
  });

  it('GET /membership/me/points-records should return points records', () => {
    return auth(customerToken).get('/membership/me/points-records').expect(200);
  });

  it('GET /membership/levels should return level configs', () => {
    return auth(customerToken)
      .get('/membership/levels')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /membership/mall/items should return mall items', () => {
    return auth(customerToken)
      .get('/membership/mall/items')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /membership/admin/mall/items (admin) - create mall item', async () => {
    const res = await auth(adminToken)
      .post('/membership/admin/mall/items')
      .send({ title: 'Test Item', description: 'Test', pointsCost: 100, stock: 50 })
      .expect(201);
    mallItemId = res.body.id;
    expect(res.body).toHaveProperty('title', 'Test Item');
  });

  it('POST /membership/admin/points/adjust (admin) - adjust points', () => {
    return auth(adminToken)
      .post('/membership/admin/points/adjust')
      .send({ userId: customerUserId, pointsDelta: 50, type: 'earn', source: 'test', remark: 'Test' })
      .expect(200);
  });

  it('POST /membership/mall/exchange - exchange points', () => {
    return auth(customerToken)
      .post('/membership/mall/exchange')
      .send({ itemId: mallItemId, quantity: 1 })
      .expect(200);
  });
});

// ============================================================
// 18. WORKER TESTS
// ============================================================
describe('=== 18. Worker Module ===', () => {
  it('PATCH /worker/me/online-status - set online', () => {
    return auth(workerToken)
      .patch('/worker/me/online-status')
      .send({ online: true, lat: 39.9042, lng: 116.4074 })
      .expect(200);
  });

  it('PATCH /worker/me/online-status - set offline', () => {
    return auth(workerToken)
      .patch('/worker/me/online-status')
      .send({ online: false })
      .expect(200);
  });

  it('GET /worker/me/income-summary should return income summary', () => {
    return auth(workerToken)
      .get('/worker/me/income-summary')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('todayIncome');
        expect(res.body).toHaveProperty('monthIncome');
      });
  });

  it('GET /worker/me/income-details should return income details', () => {
    return auth(workerToken)
      .get('/worker/me/income-details?page=1&pageSize=10')
      .expect(200);
  });

  it('POST /auth/worker/verify - submit verification', () => {
    return auth(workerToken)
      .post('/auth/worker/verify')
      .send({
        realName: '王工',
        skills: 'cleaning,moving',
        experience: 3,
        introduction: 'Experienced worker',
      })
      .expect(200);
  });

  it('POST /auth/worker/approve-mock - mock self-approve', () => {
    return auth(workerToken)
      .post('/auth/worker/approve-mock')
      .expect(200);
  });

  it('PATCH /auth/users/:id/status (admin) - update user status', () => {
    return auth(adminToken)
      .patch(`/auth/users/${customerUserId}/status`)
      .send({ status: 1 })
      .expect(200);
  });
});

// ============================================================
// 19. ADMIN TESTS
// ============================================================
describe('=== 19. Admin Module ===', () => {
  it('GET /admin/dashboard/overview should return dashboard data', () => {
    return auth(adminToken)
      .get('/admin/dashboard/overview')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('usersTotal');
        expect(res.body).toHaveProperty('workersOnline');
        expect(res.body).toHaveProperty('ordersPending');
      });
  });

  it('GET /admin/users should return paginated users', () => {
    return auth(adminToken)
      .get('/admin/users?page=1&pageSize=10')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
      });
  });

  it('GET /admin/orders should return paginated orders', () => {
    return auth(adminToken)
      .get('/admin/orders?page=1&pageSize=10')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
      });
  });

  it('GET /admin/finance/payments should return payments', () => {
    return auth(adminToken).get('/admin/finance/payments').expect(200);
  });

  it('GET /admin/finance/refunds should return refunds', () => {
    return auth(adminToken).get('/admin/finance/refunds').expect(200);
  });

  it('GET /admin/finance/withdrawals should return withdrawals', () => {
    return auth(adminToken)
      .get('/admin/finance/withdrawals')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
      });
  });

  it('GET /admin/support/tickets should return tickets', () => {
    return auth(adminToken).get('/admin/support/tickets').expect(200);
  });
});

// ============================================================
// 20. AUTH GUARD TESTS (unauthorized access)
// ============================================================
describe('=== 20. Authentication Guards ===', () => {
  it('GET /auth/profile without token should return 401', () => {
    return client.get('/auth/profile').expect(401);
  });

  it('GET /orders/my without token should return 401', () => {
    return client.get('/orders/my').expect(401);
  });

  it('POST /orders without token should return 401', () => {
    return client
      .post('/orders')
      .send({ serviceType: 'test', serviceTime: '2026-04-10', location: 'test', amount: 100 })
      .expect(401);
  });

  it('GET /addresses without token should return 401', () => {
    return client.get('/addresses').expect(401);
  });

  it('GET /coupons/my without token should return 401', () => {
    return client.get('/coupons/my').expect(401);
  });

  it('GET /admin/dashboard/overview without token should return 401', () => {
    return client.get('/admin/dashboard/overview').expect(401);
  });

  it('GET /analytics/admin/overview without token should return 401', () => {
    return client.get('/analytics/admin/overview').expect(401);
  });

  it('GET /membership/me without token should return 401', () => {
    return client.get('/membership/me').expect(401);
  });

  it('POST /files/upload without token should return 401', () => {
    return client.post('/files/upload').expect(401);
  });
});

// ============================================================
// 21. RATE LIMITER TEST
// ============================================================
describe('=== 21. Rate Limiter ===', () => {
  it('should handle normal requests', () => {
    return client.get('/health').expect(200);
  });
});

// ============================================================
// 22. INPUT VALIDATION TESTS
// ============================================================
describe('=== 22. Input Validation ===', () => {
  it('POST /auth/register without phone should fail validation', () => {
    return client
      .post('/auth/register')
      .send({ password: 'password123' })
      .expect(400);
  });

  it('POST /auth/login without phone should fail validation', () => {
    return client
      .post('/auth/login')
      .send({ password: 'password123' })
      .expect(400);
  });
});
