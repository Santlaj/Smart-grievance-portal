import api from "../utils/api";

export const adminService = {
  getStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  createOfficer: async (payload) => {
    const response = await api.post("/admin/officers", payload);
    return response.data;
  },

  getAllComplaints: async (params = {}) => {
    const response = await api.get("/admin/complaints", { params });
    return response.data;
  },

  assignOfficer: async ({ complaintId, officerId }) => {
    const response = await api.put("/admin/assign-officer", {
      complaintId,
      officerId,
    });
    return response.data;
  },
};

export default adminService;
