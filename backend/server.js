/**
 * MPloyChek Single Page Application - Backend REST API
 * 
 * Provides endpoints for:
 * 1. Role-based Authentication (Admin / General User)
 * 2. Background Verification Records with access-level filtering
 * 3. User Management CRUD (Admin only)
 * 4. Latency / Delay simulation via `?delay=ms` query parameter
 * 5. XML-backed persistent database
 */

const express = require('express');
const cors = require('cors');
const delayMiddleware = require('./delayMiddleware');
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the Angular SPA (running on port 4200) can make API calls
app.use(cors({
  origin: '*',
  exposedHeaders: ['X-Simulated-Delay']
}));

// Parse JSON request bodies
app.use(express.json());

// Latency simulation middleware applied globally
app.use(delayMiddleware);

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ================= AUTHENTICATION =================

/**
 * POST /api/auth/login
 * Validates User ID, Password, and Role selection against the database.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    if (!userId || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Password, and Role are all required.'
      });
    }

    const user = await storage.authenticateUser(userId, password, role);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please verify your User ID, Password, and selected Role.'
      });
    }

    // Generate lightweight mock session token
    const token = `mploychek-session-${user.id}-${Date.now()}`;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
});

// ================= RECORDS API =================

/**
 * GET /api/records
 * Returns candidate verification records according to user access level.
 * Accepts optional query param ?delay=ms to simulate async cloud response.
 */
app.get('/api/records', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const role = req.query.role || 'General User';

    const records = await storage.getRecords(userId, role);

    return res.status(200).json({
      success: true,
      totalCount: records.length,
      accessRole: role,
      requestedBy: userId,
      records
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve records.' });
  }
});

// ================= USER MANAGEMENT (ADMIN ONLY) =================

/**
 * GET /api/users
 * Returns all registered users in the database.
 */
app.get('/api/users', async (req, res) => {
  try {
    const role = req.headers['x-user-role'] || req.query.role;

    if (role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only Admin users are authorized to manage user accounts.'
      });
    }

    const users = await storage.getAllUsers();
    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

/**
 * POST /api/users
 * Creates a new user record in the XML database.
 */
app.post('/api/users', async (req, res) => {
  try {
    const role = req.headers['x-user-role'] || req.body.requesterRole;

    if (role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Admin authorization required to create users.'
      });
    }

    const { userId, name, email, password, role: newRole, department, status } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const createdUser = await storage.createUser({
      userId,
      name,
      email,
      password,
      role: newRole,
      department,
      status
    });

    return res.status(201).json({
      success: true,
      message: `User ${createdUser.userId} created successfully.`,
      user: createdUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Updates an existing user record.
 */
app.put('/api/users/:id', async (req, res) => {
  try {
    const role = req.headers['x-user-role'] || req.body.requesterRole;

    if (role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Admin authorization required to modify users.'
      });
    }

    const updatedUser = await storage.updateUser(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: `User ${updatedUser.userId} updated successfully.`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Removes a user record from the XML database.
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const role = req.headers['x-user-role'] || req.query.requesterRole;

    if (role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Admin authorization required to delete users.'
      });
    }

    const result = await storage.deleteUser(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ================= SYSTEM HEALTH & INFO =================

app.get('/api/health', async (req, res) => {
  try {
    const db = await storage.readDatabase();
    return res.status(200).json({
      status: 'UP',
      service: 'MPloyChek Core Verification API',
      version: '1.0.0',
      storageEngine: 'Local XML (database.xml) with Document Model abstraction',
      cloudReady: 'Compatible with AWS DynamoDB / MongoDB adapter',
      metrics: {
        totalUsers: db.users.length,
        totalRecords: db.records.length
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'DOWN', error: error.message });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 MPloyChek API Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}/api/health`);
  console.log(`⏱️ Latency simulator enabled via ?delay=ms parameter`);
  console.log(`💾 Persistence layer: XML Database (backend/data/database.xml)`);
  console.log(`====================================================`);
});
