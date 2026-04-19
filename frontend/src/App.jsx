import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Layout from "./components/Layout";
import AuthCallback from "./pages/AuthCallback";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SignIn />} />
                <Route path="/auth" element={<AuthCallback />} />

                {/* everything inside here gets the nav */}
                <Route element={<Layout />}>
                    <Route path="/app" element={<Dashboard />} />
                    <Route path="/search" element={<Search />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}