import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./assets/Pages/Login";

const DashboardLayout = lazy(() => import("./assets/Pages/DashboardLayout"));
const SignupPage = lazy(() => import("./assets/Pages/Signup"));
const ForgotPasswordPage = lazy(() => import("./assets/Pages/ForgotPassword"));
const AdminPanel = lazy(() => import("./assets/Pages/adminpannel"));

function RouteLoading({ label = "Loading…" }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            color: "#1a54d4",
            background: "linear-gradient(135deg, #e8eeff 0%, #f5f7ff 45%, #fff8f0 100%)",
        }}>
            {label}
        </div>
    );
}

export default function Router() {
    return (
        <Routes>
            <Route path="" element={<Login />} />
            <Route
                path="AnimsBusinessAnalytics"
                element={(
                    <Suspense fallback={<RouteLoading label="Loading workspace…" />}>
                        <DashboardLayout />
                    </Suspense>
                )}
            />
            <Route
                path="signup"
                element={(
                    <Suspense fallback={<RouteLoading label="Loading signup…" />}>
                        <SignupPage />
                    </Suspense>
                )}
            />
            <Route
                path="forgot-password"
                element={(
                    <Suspense fallback={<RouteLoading label="Loading…" />}>
                        <ForgotPasswordPage />
                    </Suspense>
                )}
            />
            <Route
                path="adminpannel"
                element={(
                    <Suspense fallback={<RouteLoading label="Loading admin…" />}>
                        <AdminPanel />
                    </Suspense>
                )}
            />
        </Routes>
    );
}