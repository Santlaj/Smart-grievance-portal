const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "inMemoryComplaints.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create data directory for persistence:", err.message);
  }
}

// Canonical seed complaints to ensure queues are never empty and realistic demo flow works
const DEFAULT_SEED_COMPLAINTS = [
  {
    _id: "comp_1794833375043", // The exact active grievance from the officer queue
    complaintNumber: "GRV428",
    title: "potholes",
    description: "there are many potholes on road",
    category: "Roads & Infrastructure",
    department: {
      _id: "660000000000000000000011",
      departmentName: "Roads & Infrastructure",
    },
    assignedOfficer: {
      _id: "660000000000000000000002",
      name: "Rajesh Sharma",
      email: "officer.roads@example.com",
    },
    citizen: {
      _id: "660000000000000000000001",
      name: "Ramesh Sharma",
      email: "citizen@example.com",
    },
    location: "Main Sector 14 Road",
    priority: "High",
    status: "Accepted and Assigned",
    isClosed: false,
    image: "",
    createdAt: new Date().toISOString(),
    timeline: [
      {
        title: "Complaint Submitted",
        timestamp: new Date().toISOString(),
        description: "Citizen submitted grievance. Initial AI triage completed.",
        completed: true,
      },
      {
        title: "AI Classification & Validation (95% Confidence)",
        timestamp: new Date().toISOString(),
        description: 'Categorized under "Roads & Infrastructure". Recommended department: "Roads & Infrastructure". Evidence image flagged for inspection.',
        completed: true,
      },
      {
        title: "Accepted & Assigned to Rajesh Sharma",
        timestamp: new Date().toISOString(),
        description: "Routed to Roads & Infrastructure queue. Assigned officer: Rajesh Sharma (officer.roads@example.com).",
        completed: true,
      },
    ],
  },
  {
    _id: "comp_demo_water_002",
    complaintNumber: "GRV102",
    title: "Drinking Water Pipeline Leakage",
    description: "Fresh drinking water pipeline damaged on the main lane, water continuously flowing on the street.",
    category: "Water Supply Department",
    department: {
      _id: "660000000000000000000012",
      departmentName: "Water Supply Department",
    },
    assignedOfficer: {
      _id: "660000000000000000000004",
      name: "Priya Verma",
      email: "officer.water@example.com",
    },
    citizen: {
      _id: "660000000000000000000001",
      name: "Ramesh Sharma",
      email: "citizen@example.com",
    },
    location: "Near Water Tank, Block B",
    priority: "Critical",
    status: "In Progress",
    isClosed: false,
    image: "",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    timeline: [
      {
        title: "Complaint Submitted",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: "Citizen submitted grievance.",
        completed: true,
      },
      {
        title: "Accepted & Assigned to Priya Verma",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        description: "Assigned to Priya Verma.",
        completed: true,
      },
    ],
  },
  {
    _id: "comp_demo_sanitation_003",
    complaintNumber: "GRV103",
    title: "Overflowing Garbage Dumpster",
    description: "Municipal dumpster has not been cleared for 3 days, causing foul smell and unhygienic conditions.",
    category: "Sanitation Department",
    department: {
      _id: "660000000000000000000013",
      departmentName: "Sanitation Department",
    },
    assignedOfficer: {
      _id: "660000000000000000000005",
      name: "Amit Kumar",
      email: "officer.sanitation@example.com",
    },
    citizen: {
      _id: "660000000000000000000001",
      name: "Ramesh Sharma",
      email: "citizen@example.com",
    },
    location: "Market Square, Sector 15",
    priority: "Medium",
    status: "Accepted and Assigned",
    isClosed: false,
    image: "",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    timeline: [
      {
        title: "Complaint Submitted",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        description: "Citizen submitted grievance.",
        completed: true,
      },
    ],
  },
];

function saveToDisk(list) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist complaints to disk:", err.message);
  }
}

// Attach to globalThis so across all Next.js API route workers/chunks, the exact same array is used
if (!globalThis.__smart_inMemoryComplaints__) {
  let loaded = null;
  if (fs.existsSync(STORE_FILE)) {
    try {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      loaded = JSON.parse(raw);
    } catch (err) {
      console.warn("Failed to read stored complaints from disk:", err.message);
    }
  }

  if (Array.isArray(loaded) && loaded.length > 0) {
    // Ensure the user's active complaint is present in loaded list
    const hasUserActive = loaded.some((c) => String(c._id) === "comp_1794833375043");
    if (!hasUserActive) {
      loaded.unshift(DEFAULT_SEED_COMPLAINTS[0]);
    }
    globalThis.__smart_inMemoryComplaints__ = loaded;
  } else {
    globalThis.__smart_inMemoryComplaints__ = [...DEFAULT_SEED_COMPLAINTS];
    saveToDisk(globalThis.__smart_inMemoryComplaints__);
  }
}

const inMemoryComplaints = globalThis.__smart_inMemoryComplaints__;

function persistComplaints() {
  saveToDisk(globalThis.__smart_inMemoryComplaints__);
}

module.exports = {
  inMemoryComplaints,
  persistComplaints,
};
