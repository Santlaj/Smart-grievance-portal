const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const generateToken = require("../utils/generateToken");
const { getIsConnected } = require("../config/db");

// Canonical Municipal Departments
const DEFAULT_DEPARTMENTS_DATA = [
  {
    _id: "660000000000000000000011",
    departmentName: "Roads & Infrastructure",
    description: "Potholes, footpaths, divider repairs and road maintenance",
  },
  {
    _id: "660000000000000000000012",
    departmentName: "Water Supply Department",
    description: "Pipeline leaks, drinking water contamination, pressure and supply issues",
  },
  {
    _id: "660000000000000000000013",
    departmentName: "Sanitation Department",
    description: "Garbage collection, overflowing dumpsters, sewage and cleanliness",
  },
  {
    _id: "660000000000000000000014",
    departmentName: "Electricity Department",
    description: "Streetlights, exposed cables, power outages and transformer maintenance",
  },
  {
    _id: "660000000000000000000015",
    departmentName: "Public Safety Department",
    description: "Deep open manholes, hazardous structural risks and danger zones",
  },
];

// Pre-seeded demo accounts (passwords hashed with bcrypt)
const DEFAULT_USERS = [
  {
    _id: "660000000000000000000001",
    name: "Ramesh Sharma",
    email: "citizen@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98765 43210",
    address: "Sector 14, Main Road, New Delhi",
    role: "client",
    department: null,
  },
  // 1. Roads Department Officer
  {
    _id: "660000000000000000000002",
    name: "Rajesh Sharma",
    email: "officer.roads@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 22334",
    address: "Municipal Road Works Office, Ward 4",
    role: "officer",
    department: "Roads & Infrastructure",
    departmentId: "660000000000000000000011",
  },
  // Legacy alias for general officer demo
  {
    _id: "660000000000000000000020",
    name: "Vikram Malhotra",
    email: "officer@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 22330",
    address: "Municipal Corporation Office, Ward 4",
    role: "officer",
    department: "Roads & Infrastructure",
    departmentId: "660000000000000000000011",
  },
  // 2. Water Supply Department Officer
  {
    _id: "660000000000000000000004",
    name: "Priya Verma",
    email: "officer.water@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 55667",
    address: "Water Works Division, Jal Board HQ",
    role: "officer",
    department: "Water Supply Department",
    departmentId: "660000000000000000000012",
  },
  // 3. Sanitation Department Officer
  {
    _id: "660000000000000000000005",
    name: "Amit Kumar",
    email: "officer.sanitation@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 77889",
    address: "Swachhata Division Office, Municipal Zone 2",
    role: "officer",
    department: "Sanitation Department",
    departmentId: "660000000000000000000013",
  },
  // 4. Electricity Department Officer
  {
    _id: "660000000000000000000006",
    name: "Sunita Rao",
    email: "officer.electricity@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 99001",
    address: "City Power & Streetlight Command Center",
    role: "officer",
    department: "Electricity Department",
    departmentId: "660000000000000000000014",
  },
  // 5. Public Safety Department Officer
  {
    _id: "660000000000000000000007",
    name: "Inspector Meena Joshi",
    email: "officer.safety@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98111 33442",
    address: "Disaster & Civic Safety Rapid Response Cell",
    role: "officer",
    department: "Public Safety Department",
    departmentId: "660000000000000000000015",
  },
  // 6. Central Administrator
  {
    _id: "660000000000000000000003",
    name: "Central Administrator",
    email: "admin@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
    phone: "+91 98222 33445",
    address: "Municipal HQ, Administrator Wing",
    role: "admin",
    department: null,
  },
];

// In-memory runtime store for when MongoDB daemon is not running
let inMemoryUsers = [...DEFAULT_USERS];

// Helper to normalize roles
const normalizeRole = (r) => {
  if (!r) return "";
  const lower = String(r).toLowerCase().trim();
  if (lower === "citizen" || lower === "client") return "client";
  return lower;
};

// Seed demo users and canonical departments into MongoDB if connected
const seedDatabaseIfConnected = async () => {
  if (!getIsConnected()) return;
  try {
    // 1. Seed or find canonical departments
    const deptMap = {};
    for (const d of DEFAULT_DEPARTMENTS_DATA) {
      let deptRecord = await Department.findOne({
        departmentName: { $regex: new RegExp(`^${d.departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") },
      });
      if (!deptRecord) {
        deptRecord = await Department.create({
          _id: d._id,
          departmentName: d.departmentName,
          description: d.description,
          isActive: true,
        });
      }
      deptMap[d.departmentName] = deptRecord;
    }

    // 2. Seed or sync users with proper department ObjectId
    for (const u of DEFAULT_USERS) {
      let targetDeptId = null;
      if (u.department && deptMap[u.department]) {
        targetDeptId = deptMap[u.department]._id;
      }

      const existingUser = await User.findOne({ email: u.email });
      if (!existingUser) {
        const newUser = await User.create({
          _id: u._id,
          name: u.name,
          email: u.email,
          password: u.passwordHash,
          phone: u.phone,
          address: u.address,
          role: u.role,
          department: targetDeptId,
        });
        if (targetDeptId) {
          await Department.findByIdAndUpdate(targetDeptId, { headOfficer: newUser._id });
        }
      } else {
        // Ensure department is linked on existing user
        if (targetDeptId && (!existingUser.department || String(existingUser.department) !== String(targetDeptId))) {
          existingUser.department = targetDeptId;
          await existingUser.save();
          await Department.findByIdAndUpdate(targetDeptId, { headOfficer: existingUser._id });
        }
      }
    }
  } catch (err) {
    // ignore duplicate or background seed errors
  }
};
if (process.env.NODE_ENV !== "production") {
  setTimeout(seedDatabaseIfConnected, 2000);
}

// Register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || name.trim().length < 2 || name.length > 120) {
      return res.status(400).json({ message: "Enter a valid email address and a name between 2 and 120 characters." });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
    }
    if (phone) {
      const cleanPhone = String(phone).replace(/[\s-]/g, "");
      if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." });
      }
    }
    if (address && (typeof address !== "string" || address.length < 5 || address.length > 250)) {
      return res.status(400).json({ message: "Please provide a valid address between 5 and 250 characters." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const safeRole = "client";

    // 1. If MongoDB is connected, use Mongoose
    if (getIsConnected()) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name ? name.trim() : cleanEmail.split("@")[0],
        email: cleanEmail,
        password: hashedPassword,
        phone: phone || "",
        address: address || "",
        role: safeRole,
        department: null,
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role === "citizen" ? "client" : user.role,
        department: null,
        token: generateToken(user._id),
      });
    }

    // 2. Resilient In-Memory Fallback
    const existing = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: "user_" + Date.now(),
      name: name ? name.trim() : cleanEmail.split("@")[0],
      email: cleanEmail,
      passwordHash: hashedPassword,
      phone: phone || "",
      address: address || "",
      role: safeRole,
      department: null,
    };
    inMemoryUsers.push(newUser);

    return res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || "",
      address: newUser.address || "",
      role: newUser.role,
      department: newUser.department,
      token: generateToken(newUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || password.length > 128) {
      return res.status(400).json({ message: "Please provide both email and password" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. If MongoDB is connected
    if (getIsConnected()) {
      const user = await User.findOne({ email: cleanEmail }).populate("department", "departmentName");

      if (user && (await bcrypt.compare(password, user.password))) {
        if (user.isSuspended) {
          return res.status(403).json({
            message: "This officer account has been suspended by the Central Administrator. Contact HQ for clearance.",
          });
        }
        // Check requested role matching if specified
        if (role) {
          const reqRole = normalizeRole(role);
          const userRole = normalizeRole(user.role);
          if (reqRole && userRole && reqRole !== userRole) {
            return res.status(401).json({
              message: `This account is registered as '${user.role}'. Please use the matching portal tab.`,
            });
          }
        }

        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          address: user.address || "",
          role: user.role === "citizen" ? "client" : user.role,
          department: user.department ? user.department.departmentName : null,
          token: generateToken(user._id),
        });
      }
    }

    // 2. Check in-memory store (works if MongoDB is offline or for demo users)
    const memUser = inMemoryUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (memUser) {
      const match = await bcrypt.compare(password, memUser.passwordHash);
      if (match) {
        if (role) {
          const reqRole = normalizeRole(role);
          const userRole = normalizeRole(memUser.role);
          if (reqRole && userRole && reqRole !== userRole) {
            return res.status(401).json({
              message: `This account is registered as '${memUser.role}'. Please use the matching portal tab.`,
            });
          }
        }

        return res.json({
          _id: memUser._id,
          name: memUser.name,
          email: memUser.email,
          phone: memUser.phone || "",
          address: memUser.address || "",
          role: memUser.role,
          department: memUser.department || null,
          token: generateToken(memUser._id),
        });
      }
    }

    return res.status(401).json({
      message: "Invalid email or password. Check credentials or try one of the demo logins.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Profile
const getUserProfile = async (req, res) => {
  try {
    if (getIsConnected()) {
      const user = await User.findById(req.user._id).select("-password").populate("department", "departmentName");
      if (user) return res.json(user);
    }
    const memUser = inMemoryUsers.find((u) => String(u._id) === String(req.user._id));
    if (memUser) {
      const { passwordHash, ...rest } = memUser;
      return res.json(rest);
    }
    res.status(404).json({ message: "User not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Profile
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (getIsConnected()) {
      const user = await User.findById(req.user._id);
      if (user) {
        if (name) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (address !== undefined) user.address = address.trim();
        const updated = await user.save();

        return res.json({
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          address: updated.address,
          role: updated.role === "citizen" ? "client" : updated.role,
          token: generateToken(updated._id),
        });
      }
    }

    const memUser = inMemoryUsers.find((u) => String(u._id) === String(req.user._id));
    if (memUser) {
      if (name) memUser.name = name.trim();
      if (phone !== undefined) memUser.phone = phone.trim();
      if (address !== undefined) memUser.address = address.trim();

      return res.json({
        _id: memUser._id,
        name: memUser.name,
        email: memUser.email,
        phone: memUser.phone,
        address: memUser.address,
        role: memUser.role,
        token: generateToken(memUser._id),
      });
    }

    res.status(404).json({ message: "User not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    if (getIsConnected()) {
      const user = await User.findById(req.user._id);
      if (user) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Current password does not match records" });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.json({ message: "Password updated successfully" });
      }
    }

    const memUser = inMemoryUsers.find((u) => String(u._id) === String(req.user._id));
    if (memUser) {
      const isMatch = await bcrypt.compare(currentPassword, memUser.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password does not match records" });
      }
      memUser.passwordHash = await bcrypt.hash(newPassword, 10);
      return res.json({ message: "Password updated successfully" });
    }

    res.status(404).json({ message: "User not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  inMemoryUsers,
};
