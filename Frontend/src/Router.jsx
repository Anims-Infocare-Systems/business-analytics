import { Routes, Route } from "react-router-dom";
import Login from "./assets/Pages/Login";
import DashboardLayout from "./assets/Pages/DashboardLayout";



export default function Router() {
    return (
        <Routes>
            <Route path="" element={<Login />} />
            <Route path="AnimsBusinessAnalytics" element={<DashboardLayout />} />
        </Routes>
    );
}
