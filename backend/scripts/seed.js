const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is not defined in backend/.env!");
  process.exit(1);
}

const DEPARTMENTS = [
  {
    _id: new mongoose.Types.ObjectId("660000000000000000000011"),
    departmentName: "Roads & Infrastructure",
    description: "Potholes, footpaths, divider repairs and road maintenance",
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId("660000000000000000000012"),
    departmentName: "Water Supply Department",
    description: "Pipeline leaks, drinking water contamination, pressure and supply issues",
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId("660000000000000000000013"),
    departmentName: "Sanitation Department",
    description: "Garbage collection, overflowing dumpsters, sewage and cleanliness",
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId("660000000000000000000014"),
    departmentName: "Electricity Department",
    description: "Streetlights, exposed cables, power outages and transformer maintenance",
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId("660000000000000000000015"),
    departmentName: "Public Safety Department",
    description: "Deep open manholes, hazardous structural risks and danger zones",
    isActive: true,
  },
];

async function seed() {
  console.log("--------------------------------------------------");
  console.log("🚀 Smart Grievance Database Seeder");
  console.log("📡 Connecting to MongoDB Atlas...");
  console.log("URI:", MONGO_URI.replace(/:([^:@]+)@/, ":****@"));
  console.log("--------------------------------------------------");

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const db = mongoose.connection.db;
    const departmentsCol = db.collection("departments");
    const usersCol = db.collection("users");

    // 1. Seed Departments
    console.log("\n📁 Seeding 5 Canonical Departments...");
    for (const dept of DEPARTMENTS) {
      await departmentsCol.updateOne(
        { _id: dept._id },
        { $set: dept },
        { upsert: true }
      );
      console.log(`   + Department: ${dept.departmentName}`);
    }

    // 2. Hash default password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 3. Seed Users
    const usersToSeed = [
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000003"),
        name: "Central Administrator",
        email: "admin@example.com",
        password: hashedPassword,
        phone: "+91 98222 33445",
        address: "Municipal HQ, Administrator Wing",
        role: "admin",
        department: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000004"),
        name: "Priya Verma",
        email: "officer.water@example.com",
        password: hashedPassword,
        phone: "+91 98111 55667",
        address: "Water Works Division, Jal Board HQ",
        role: "officer",
        department: new mongoose.Types.ObjectId("660000000000000000000012"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000002"),
        name: "Rajesh Sharma",
        email: "officer.roads@example.com",
        password: hashedPassword,
        phone: "+91 98111 22334",
        address: "Municipal Road Works Office, Ward 4",
        role: "officer",
        department: new mongoose.Types.ObjectId("660000000000000000000011"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000005"),
        name: "Amit Kumar",
        email: "officer.sanitation@example.com",
        password: hashedPassword,
        phone: "+91 98111 77889",
        address: "Swachhata Division Office, Municipal Zone 2",
        role: "officer",
        department: new mongoose.Types.ObjectId("660000000000000000000013"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000006"),
        name: "Sunita Rao",
        email: "officer.electricity@example.com",
        password: hashedPassword,
        phone: "+91 98111 99001",
        address: "City Power & Streetlight Command Center",
        role: "officer",
        department: new mongoose.Types.ObjectId("660000000000000000000014"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000007"),
        name: "Inspector Meena Joshi",
        email: "officer.safety@example.com",
        password: hashedPassword,
        phone: "+91 98111 33442",
        address: "Disaster & Civic Safety Rapid Response Cell",
        role: "officer",
        department: new mongoose.Types.ObjectId("660000000000000000000015"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId("660000000000000000000001"),
        name: "Ramesh Sharma",
        email: "citizen@example.com",
        password: hashedPassword,
        phone: "+91 98765 43210",
        address: "Sector 14, Main Road, New Delhi",
        role: "client",
        department: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    console.log("\n👤 Seeding Initial Accounts...");
    for (const user of usersToSeed) {
      await usersCol.updateOne(
        { email: user.email },
        { $set: user },
        { upsert: true }
      );
      console.log(`   + [${user.role.toUpperCase()}] ${user.name} (${user.email}) -> password123`);
    }

    // Link head officers
    await departmentsCol.updateOne(
      { _id: new mongoose.Types.ObjectId("660000000000000000000012") },
      { $set: { headOfficer: new mongoose.Types.ObjectId("660000000000000000000004") } }
    );
    await departmentsCol.updateOne(
      { _id: new mongoose.Types.ObjectId("660000000000000000000011") },
      { $set: { headOfficer: new mongoose.Types.ObjectId("660000000000000000000002") } }
    );

    // 4. Synchronize existing complaints to canonical department ObjectIds & officers
    console.log("\n🔄 Synchronizing complaints with department officers...");
    const complaintsCol = db.collection("complaints");

    // 5. Cleanup duplicate/non-canonical department documents in Atlas
    console.log("🧹 Cleaning up duplicate department records in Atlas...");
    const canonicalRoads = new mongoose.Types.ObjectId("660000000000000000000011");
    const canonicalWater = new mongoose.Types.ObjectId("660000000000000000000012");
    const canonicalSanitation = new mongoose.Types.ObjectId("660000000000000000000013");
    const canonicalElectricity = new mongoose.Types.ObjectId("660000000000000000000014");
    const canonicalSafety = new mongoose.Types.ObjectId("660000000000000000000015");

    const canonicalIds = DEPARTMENTS.map((d) => d._id);
    const nonCanonicalDepts = await departmentsCol.find({ _id: { $nin: canonicalIds } }).toArray();

    for (const nonCanon of nonCanonicalDepts) {
      const name = (nonCanon.departmentName || "").toLowerCase();
      let targetCanonicalId = null;
      let targetOfficerId = null;

      if (name.includes("road") || name.includes("pothole") || name.includes("infra")) {
        targetCanonicalId = canonicalRoads;
        targetOfficerId = new mongoose.Types.ObjectId("660000000000000000000002");
      } else if (name.includes("water") || name.includes("drain") || name.includes("jal")) {
        targetCanonicalId = canonicalWater;
        targetOfficerId = new mongoose.Types.ObjectId("660000000000000000000004");
      } else if (name.includes("sanitat") || name.includes("garbage") || name.includes("waste")) {
        targetCanonicalId = canonicalSanitation;
        targetOfficerId = new mongoose.Types.ObjectId("660000000000000000000005");
      } else if (name.includes("electr") || name.includes("power") || name.includes("light")) {
        targetCanonicalId = canonicalElectricity;
        targetOfficerId = new mongoose.Types.ObjectId("660000000000000000000006");
      } else if (name.includes("safety") || name.includes("hazard") || name.includes("danger")) {
        targetCanonicalId = canonicalSafety;
        targetOfficerId = new mongoose.Types.ObjectId("660000000000000000000007");
      }

      if (targetCanonicalId) {
        // Re-link any complaints pointing to the duplicate department
        const upd = await complaintsCol.updateMany(
          { department: nonCanon._id },
          { $set: { department: targetCanonicalId, assignedOfficer: targetOfficerId } }
        );
        // Delete the duplicate department record
        await departmentsCol.deleteOne({ _id: nonCanon._id });
        console.log(`   - Merged & removed duplicate "${nonCanon.departmentName}" -> Re-linked ${upd.modifiedCount} complaint(s) to officer`);
      }
    }

    console.log("\n==================================================");
    console.log("🎉 SUCCESS: All Departments & Accounts Initialized in MongoDB Atlas!");
    console.log("==================================================");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ CONNECTION / SEED ERROR:");
    console.error(err.message);
    if (err.name === "MongoServerError") {
      console.error("Code:", err.code);
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seed();
