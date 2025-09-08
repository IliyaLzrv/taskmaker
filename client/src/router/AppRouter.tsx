import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../components/Layout/AppLayout";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

import ProfilePage from "../pages/User/ProfilePage";
import AssignedTasksPage from "../pages/User/AssignedTasksPage";
import CompletedHistoryPage from "../pages/User/CompletedHistoryPage";
import TaskDetailPage from "../pages/User/TaskDetailPage";
import BrowseTasksPage from "../pages/User/BrowseTasksPage";

import AdminDashboardPage from "../pages/Admin/AdminDashboardPage";
import CreateTaskPage from "../pages/Admin/CreateTaskPage";
import UsersPage from "../pages/Admin/UsersPage";
import RequestsPage from "../pages/Admin/RequestsPage";

import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/tasks"} replace />;
}

export default function AppRouter() {


  
  return (
    <Routes>
      {/* Wrap everything in the layout so the header/nav is always present */}
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* User */}
        <Route
          path="/tasks"
          element={<ProtectedRoute><AssignedTasksPage /></ProtectedRoute>}
        />
        <Route
          path="/tasks/browse"
          element={<ProtectedRoute><BrowseTasksPage /></ProtectedRoute>}
        />
        <Route
          path="/tasks/done"
          element={<ProtectedRoute><CompletedHistoryPage /></ProtectedRoute>}
        />
        <Route
          path="/tasks/:id"
          element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/me"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={<ProtectedRoute role="ADMIN"><AdminDashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/create"
          element={<ProtectedRoute role="ADMIN"><CreateTaskPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/users"
          element={<ProtectedRoute role="ADMIN"><UsersPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/requests"
          element={<ProtectedRoute role="ADMIN"><RequestsPage /></ProtectedRoute>}
        />

        {/* Default */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
