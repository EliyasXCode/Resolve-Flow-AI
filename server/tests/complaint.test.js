import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Complaint from '../src/models/Complaint.js';

describe('Complaint CRUD, Tenant Isolation & Order Ownership', () => {
  let customerAToken;
  let customerBToken;
  let supportToken;
  let customerAId;
  let customerBId;
  let customerAOrder;
  let customerBOrder;
  let customerAComplaintId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    // 1. Create Customer A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Customer Alice',
      email: `alice-${Date.now()}@example.com`,
      password: 'AlicePassword123!',
    });
    const getAuthCookie = (headers) => {
      const cookies = headers['set-cookie'] || [];
      const match = cookies.find((c) => c.startsWith('resolveflow_token='));
      return match ? match.split(';')[0] : '';
    };

    customerAToken = getAuthCookie(resA.headers);
    customerAId = resA.body.user.id;

    // 2. Create Customer B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Customer Bob',
      email: `bob-${Date.now()}@example.com`,
      password: 'BobPassword123!',
    });
    customerBToken = getAuthCookie(resB.headers);
    customerBId = resB.body.user.id;

    // 3. Log in as Support
    const resSupport = await request(app).post('/api/auth/login').send({
      email: 'support@resolveflow.ai',
      password: 'SupportPassword123!',
    });
    supportToken = getAuthCookie(resSupport.headers);

    // 4. Create orders for A and B
    customerAOrder = await Order.create({
      customerId: customerAId,
      orderNumber: `ORD-ALICE-${Date.now()}`,
      items: [{ name: 'Wireless Mouse', quantity: 1, price: 29.99, sku: 'MOU-01' }],
      totalAmount: 29.99,
      status: 'DELIVERED',
    });

    customerBOrder = await Order.create({
      customerId: customerBId,
      orderNumber: `ORD-BOB-${Date.now()}`,
      items: [{ name: 'Mechanical Keyboard', quantity: 1, price: 99.99, sku: 'KEY-01' }],
      totalAmount: 99.99,
      status: 'DELIVERED',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /.*(alice|bob)-.*@example\.com/ });
    if (customerAOrder) await Order.deleteOne({ _id: customerAOrder._id });
    if (customerBOrder) await Order.deleteOne({ _id: customerBOrder._id });
    if (customerAComplaintId) await Complaint.deleteOne({ _id: customerAComplaintId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('Customer A can file a complaint for their own verified order', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Cookie', customerAToken)
      .send({
        title: 'Broken mouse wheel on delivery',
        description: 'The scroll wheel on my wireless mouse arrived completely loose and unresponsive.',
        orderId: customerAOrder._id.toString(),
        category: 'DAMAGED_ITEM',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.title).toBe('Broken mouse wheel on delivery');
    expect(res.body.complaint.status).toBe('SUBMITTED');
    customerAComplaintId = res.body.complaint._id;
  });

  it('SECURITY: Customer A CANNOT file a complaint against Customer B order', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Cookie', customerAToken)
      .send({
        title: 'Unauthorized order complaint',
        description: 'Trying to claim another user order item to scam replacement.',
        orderId: customerBOrder._id.toString(),
        category: 'DAMAGED_ITEM',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ownership/i);
  });

  it('Customer A sees only their own complaints in the list', async () => {
    const res = await request(app)
      .get('/api/complaints')
      .set('Cookie', customerAToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.complaints)).toBe(true);
    // Every complaint returned must belong to Customer A
    res.body.complaints.forEach((c) => {
      expect(c.customerId._id.toString()).toBe(customerAId.toString());
    });
  });

  it('SECURITY: Customer B CANNOT view Customer A complaint details by ID', async () => {
    const res = await request(app)
      .get(`/api/complaints/${customerAComplaintId}`)
      .set('Cookie', customerBToken);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied|permission/i);
  });

  it('Customer A CAN view their own complaint details by ID', async () => {
    const res = await request(app)
      .get(`/api/complaints/${customerAComplaintId}`)
      .set('Cookie', customerAToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint._id.toString()).toBe(customerAComplaintId.toString());
  });

  it('Support staff CAN view all complaints in queue regardless of customer', async () => {
    const res = await request(app)
      .get('/api/complaints')
      .set('Cookie', supportToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const hasAliceComplaint = res.body.complaints.some(
      (c) => c._id.toString() === customerAComplaintId.toString()
    );
    expect(hasAliceComplaint).toBe(true);
  });

  it('Support staff can update complaint status', async () => {
    const res = await request(app)
      .patch(`/api/complaints/${customerAComplaintId}/status`)
      .set('Cookie', supportToken)
      .send({
        status: 'TRIAGING',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.status).toBe('TRIAGING');
  });

  it('Customer CANNOT update complaint status (Support/Admin only)', async () => {
    const res = await request(app)
      .patch(`/api/complaints/${customerAComplaintId}/status`)
      .set('Cookie', customerAToken)
      .send({
        status: 'COMPLETED',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
