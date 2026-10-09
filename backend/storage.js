/**
 * MPloyChek Data Storage Service
 * 
 * Provides an XML-backed persistence layer using xml2js.
 * Implements a repository pattern so the storage mechanism can easily be
 * swapped between Local XML, MongoDB, or AWS DynamoDB.
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const DB_PATH = path.join(__dirname, 'data', 'database.xml');

// Helper to read and parse the XML file into JavaScript object
async function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found at ${DB_PATH}`);
    }
    const rawXml = fs.readFileSync(DB_PATH, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false, trim: true });
    const result = await parser.parseStringPromise(rawXml);

    // Normalize users array
    let users = [];
    if (result && result.database && result.database.users && result.database.users.user) {
      const u = result.database.users.user;
      users = Array.isArray(u) ? u : [u];
    }

    // Normalize records array
    let records = [];
    if (result && result.database && result.database.records && result.database.records.record) {
      const r = result.database.records.record;
      records = Array.isArray(r) ? r : [r];
    }

    return { users, records };
  } catch (error) {
    console.error('[StorageService] Error reading XML database:', error);
    throw error;
  }
}

// Helper to serialize JavaScript object back into formatted XML and write to disk
async function saveDatabase(data) {
  try {
    const builder = new xml2js.Builder({
      rootName: 'database',
      headless: false,
      renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });

    const xmlObject = {
      users: { user: data.users },
      records: { record: data.records }
    };

    const xml = builder.buildObject(xmlObject);
    fs.writeFileSync(DB_PATH, xml, 'utf-8');
    return true;
  } catch (error) {
    console.error('[StorageService] Error saving XML database:', error);
    throw error;
  }
}

// ================= USER OPERATIONS =================

// Find user by credentials and role
async function authenticateUser(userId, password, role) {
  const db = await readDatabase();
  const user = db.users.find(u => 
    u.userId.toLowerCase() === userId.toLowerCase() &&
    u.password === password &&
    u.role.toLowerCase() === role.toLowerCase()
  );

  if (!user) return null;

  // Don't leak raw password in return payload
  const { password: _, ...safeUser } = user;
  return safeUser;
}

// Get all users (Admin only)
async function getAllUsers() {
  const db = await readDatabase();
  return db.users.map(({ password, ...safeUser }) => safeUser);
}

// Find user by unique system ID
async function getUserById(id) {
  const db = await readDatabase();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// Create new user (Admin only)
async function createUser(newUser) {
  const db = await readDatabase();

  // Validate duplicate userId
  const exists = db.users.some(u => u.userId.toLowerCase() === newUser.userId.toLowerCase());
  if (exists) {
    throw new Error(`User ID "${newUser.userId}" already exists.`);
  }

  const generatedId = `USR-${String(db.users.length + 1).padStart(3, '0')}`;
  const userRecord = {
    id: generatedId,
    userId: newUser.userId.trim(),
    password: newUser.password || 'welcome123',
    name: newUser.name || newUser.userId,
    email: newUser.email || `${newUser.userId}@mploychek.com`,
    role: newUser.role === 'Admin' ? 'Admin' : 'General User',
    department: newUser.department || 'Operations',
    status: newUser.status || 'Active',
    createdAt: new Date().toISOString()
  };

  db.users.push(userRecord);
  await saveDatabase(db);

  const { password: _, ...safeUser } = userRecord;
  return safeUser;
}

// Update existing user (Admin only)
async function updateUser(id, updateData) {
  const db = await readDatabase();
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    throw new Error(`User with ID ${id} not found.`);
  }

  // Prevent modifying internal ID
  const currentUser = db.users[index];
  const updatedUser = {
    ...currentUser,
    name: updateData.name !== undefined ? updateData.name : currentUser.name,
    email: updateData.email !== undefined ? updateData.email : currentUser.email,
    role: updateData.role !== undefined ? updateData.role : currentUser.role,
    department: updateData.department !== undefined ? updateData.department : currentUser.department,
    status: updateData.status !== undefined ? updateData.status : currentUser.status
  };

  // If password update requested
  if (updateData.password) {
    updatedUser.password = updateData.password;
  }

  db.users[index] = updatedUser;
  await saveDatabase(db);

  const { password: _, ...safeUser } = updatedUser;
  return safeUser;
}

// Delete user (Admin only)
async function deleteUser(id) {
  const db = await readDatabase();
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    throw new Error(`User with ID ${id} not found.`);
  }

  const deletedUser = db.users[index];
  db.users.splice(index, 1);
  await saveDatabase(db);

  return { success: true, message: `User ${deletedUser.userId} deleted successfully.` };
}

// ================= RECORD OPERATIONS =================

/**
 * Get records based on user's role and user ID:
 * - Admin: Sees all records with full confidential risk analysis and system metadata.
 * - General User: Sees records initiated by them or general-access records,
 *   with confidential flags filtered/sanitized.
 */
async function getRecords(userId, role) {
  const db = await readDatabase();

  if (role === 'Admin') {
    // Admin has full view of all candidate checks
    return db.records.map(r => ({
      ...r,
      isAdminView: true
    }));
  } else {
    // General user view:
    // Only records submitted by this user OR marked as General access
    return db.records
      .filter(r => r.submittedBy.toLowerCase() === userId.toLowerCase() || r.accessLevel === 'General')
      .map(r => ({
        id: r.id,
        candidateName: r.candidateName,
        candidateRole: r.candidateRole,
        verificationType: r.verificationType,
        submittedBy: r.submittedBy,
        status: r.status,
        dateInitiated: r.dateInitiated,
        notes: r.notes,
        blockchainHash: r.blockchainHash,
        accessLevel: 'General Access',
        // Mask confidential risk level for general users
        riskLevel: r.submittedBy.toLowerCase() === userId.toLowerCase() ? r.riskLevel : 'Restricted'
      }));
  }
}

module.exports = {
  readDatabase,
  saveDatabase,
  authenticateUser,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRecords
};
