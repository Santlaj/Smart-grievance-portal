import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CivicSaathi from "./components/CivicSaathi";

// Public Pages
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

// Citizen Portal Pages
const CitizenDashboard = lazy(() => import("./pages/citizen/CitizenDashboard"));
const TrackStatus = lazy(() => import("./pages/citizen/TrackStatus"));
const ComplaintDetails = lazy(() => import("./pages/citizen/ComplaintDetails"));
const Profile = lazy(() => import("./pages/citizen/Profile"));
const CitizenSettings = lazy(() => import("./pages/citizen/CitizenSettings"));
const GrievanceCenter = lazy(() => import("./pages/citizen/GrievanceCenter"));
const RaiseComplaint = lazy(() => import("./pages/citizen/RaiseComplaint"));
const MyComplaints = lazy(() => import("./pages/citizen/MyComplaints"));
const Notifications = lazy(() => import("./pages/citizen/Notifications"));

// Government Portal Pages
const GovernmentDashboard = lazy(() => import("./pages/government/GovernmentDashboard"));
const AssignedComplaints = lazy(() => import("./pages/government/AssignedComplaints"));
const AIReviewCenter = lazy(() => import("./pages/government/AIReviewCenter"));
const GovernmentReports = lazy(() => import("./pages/government/GovernmentReports"));
const Announcements = lazy(() => import("./pages/government/Announcements"));
const Settings = lazy(() => import("./pages/government/Settings"));

// Administrator Portal Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOfficers = lazy(() => import("./pages/admin/AdminOfficers"));
const AdminComplaints = lazy(() => import("./pages/admin/AdminComplaints"));
const AdminDirectives = lazy(() => import("./pages/admin/AdminDirectives"));

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Suspense fallback={<div role="status" className="p-6 text-center">Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Citizen Portal (Protected for citizens) */}
            <Route
              path="/citizen/dashboard"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/grievance-center"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <GrievanceCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/raise"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <RaiseComplaint />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/complaints"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <MyComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/track"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <TrackStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/nearby"
              element={<Navigate to="/citizen/complaints" replace />}
            />
            <Route
              path="/citizen/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <ComplaintDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/profile"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/settings"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <CitizenSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/notifications"
              element={
                <ProtectedRoute allowedRoles={["citizen"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* Government Portal (Protected for Officers & Admins) */}
            <Route
              path="/government/dashboard"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <GovernmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/government/complaints"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <AssignedComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/government/ai-review"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <AIReviewCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/government/map"
              element={<Navigate to="/government/complaints" replace />}
            />
            <Route
              path="/government/reports"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <GovernmentReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/government/announcements"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <Announcements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/government/settings"
              element={
                <ProtectedRoute allowedRoles={["officer", "admin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Backward compatibility aliases */}
            <Route path="/dashboard" element={<Navigate to="/citizen/dashboard" replace />} />
            <Route path="/raise-complaint" element={<Navigate to="/citizen/raise" replace />} />
            <Route path="/my-complaints" element={<Navigate to="/citizen/complaints" replace />} />
            <Route path="/complaint/:id" element={<Navigate to="/citizen/complaints/:id" replace />} />
            <Route path="/profile" element={<Navigate to="/citizen/profile" replace />} />
            <Route path="/settings" element={<Navigate to="/citizen/settings" replace />} />
            <Route path="/officer" element={<Navigate to="/government/dashboard" replace />} />
            <Route path="/officer/assigned" element={<Navigate to="/government/complaints" replace />} />
            {/* Administrator Portal (Protected strictly for role: admin) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/officers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminOfficers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/directives"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDirectives />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <CivicSaathi />
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
