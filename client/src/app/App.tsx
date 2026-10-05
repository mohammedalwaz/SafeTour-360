import { Navigate, Route, Routes } from "react-router-dom";
import AuthenticatedArea from "../features/auth/AuthenticatedArea";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import RegisterPage from "../pages/RegisterPage";
import { PublicOnlyRoute, RequireRoleRoute } from "./RouteGuards";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireRoleRoute role="tourist" />}>
        <Route
          path="/tourist"
          element={<AuthenticatedArea role="tourist" />}
        />
      </Route>
      <Route element={<RequireRoleRoute role="admin" />}>
        <Route path="/admin" element={<AuthenticatedArea role="admin" />} />
      </Route>
      <Route path="/not-found" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
