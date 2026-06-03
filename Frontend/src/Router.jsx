import { Routes, Route } from "react-router-dom";
import Login from "./assets/Pages/Login";
import DashboardLayout from "./assets/Pages/DashboardLayout";
import SignupPage from "./assets/Pages/Signup";
import ForgotPasswordPage from "./assets/Pages/ForgotPassword";

export default function Router() {
    return (
        <Routes>
            <Route path="" element={<Login />} />
            <Route path="AnimsBusinessAnalytics" element={<DashboardLayout />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
    );
}
