const test = require("node:test");
const assert = require("node:assert/strict");
const { submitComplaint, getMyComplaints, getComplaintById } = require("../controllers/complaintController");
const { updateComplaintStatus, getAssignedComplaints } = require("../controllers/officerController");

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("Complaint Lifecycle & Persistence: Submit, View, Update without disappearing", async (t) => {
  const citizenUser = {
    _id: "660000000000000000000001",
    name: "Ramesh Sharma",
    email: "citizen@example.com",
    role: "client",
  };

  const roadsOfficer = {
    _id: "660000000000000000000002",
    name: "Rajesh Sharma",
    email: "officer.roads@example.com",
    role: "officer",
    department: "Roads & Infrastructure",
  };

  let createdId = null;

  await t.test("citizen can submit a new complaint", async () => {
    const req = {
      user: citizenUser,
      body: {
        title: "Test Potholes on Main Road",
        description: "Large deep potholes near the crossroad",
        category: "Roads & Infrastructure",
        location: "Sector 14 Crossroad",
        priority: "High",
        image: "",
      },
    };
    const res = mockRes();
    await submitComplaint(req, res);
    assert.equal(res.statusCode, 201);
    assert.ok(res.body._id);
    createdId = res.body._id;
  });

  await t.test("complaint does not disappear and is returned in getMyComplaints", async () => {
    const req = {
      user: citizenUser,
      query: { all: "true" },
    };
    const res = mockRes();
    await getMyComplaints(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    const found = res.body.find((c) => String(c._id) === String(createdId));
    assert.ok(found, "Newly submitted complaint must be present in citizen list");
  });

  await t.test("complaint can be retrieved by ID directly", async () => {
    const req = {
      user: citizenUser,
      params: { id: createdId },
    };
    const res = mockRes();
    await getComplaintById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body._id, createdId);
  });

  await t.test("designated roads officer can update the complaint status without 404", async () => {
    const req = {
      user: roadsOfficer,
      params: { id: createdId },
      body: {
        status: "Needs More Information",
        remarks: "done",
      },
    };
    const res = mockRes();
    await updateComplaintStatus(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.complaint.status, "Needs More Information");
    assert.equal(res.body.complaint.remarks, "done");
  });

  await t.test("user's exact active complaint from screenshot can be updated without 404", async () => {
    const targetScreenshotId = "comp_1794833375043";
    const req = {
      user: roadsOfficer,
      params: { id: targetScreenshotId },
      body: {
        status: "Needs More Information",
        remarks: "done",
      },
    };
    const res = mockRes();
    await updateComplaintStatus(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.complaint._id, targetScreenshotId);
    assert.equal(res.body.complaint.status, "Needs More Information");
    assert.equal(res.body.complaint.remarks, "done");
  });
});
