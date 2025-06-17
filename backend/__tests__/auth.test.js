// File: seokey/backend/__tests__/auth.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = mongoose.model('User');
const KeywordList = mongoose.model('KeywordList');

// Increase Jest's default timeout for potentially slow async operations
jest.setTimeout(30000);

let mongoServer;

// --- Main Test Setup ---
// This runs once before all tests in this file.
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// This runs once after all tests in this file have completed.
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// This runs after EACH test, ensuring a clean database slate.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});


// --- Test Suite for Authentication Endpoints ---
describe('Authentication API', () => {
  const testUser = { email: 'test@example.com', password: 'password123' };

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).not.toBeNull();
  });

  it('should fail to register a user with an existing email', async () => {
    // First, create the user
    await new User({ email: testUser.email, password: 'hashedpassword' }).save();

    // Then, attempt to register again
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toBe('User already exists');
  });

  it('should login an existing user successfully', async () => {
    // To test login, we must first register a user
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should fail to login with incorrect credentials', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });
      
    expect(res.statusCode).toEqual(400);
  });
});


// --- Test Suite for Protected List Endpoints ---
describe('Protected Keyword List API', () => {
  let token;
  let userId;

  // Before each test in this block, register and log in a user
  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'listtester@example.com',
      password: 'password123'
    });
    token = res.body.token;

    const user = await User.findOne({email: 'listtester@example.com'});
    userId = user._id.toString();
  });

  it('should create a new list for an authenticated user', async () => {
    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Test List', keywords: [{keyword: 'hello'}] });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe('My Test List');
    expect(res.body.user).toBe(userId);
  });

  it('should NOT get lists without a token', async () => {
    const res = await request(app).get('/api/lists');
    expect(res.statusCode).toEqual(401);
  });

  it('should get all lists for the correct authenticated user', async () => {
    // Create lists for the logged-in user
    await new KeywordList({ name: 'List 1', user: userId, keywords: [] }).save();
    await new KeywordList({ name: 'List 2', user: userId, keywords: [] }).save();

    const res = await request(app)
      .get('/api/lists')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(2);
  });
});
