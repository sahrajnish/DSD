
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("user");
  return isAuthenticated ? children : <Navigate to="/login" />;
}
