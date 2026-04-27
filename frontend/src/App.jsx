import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Layout from "./components/Layout";
import AuthCallback from "./pages/AuthCallback";
import ArtistPage from "./pages/ArtistPage.jsx";
import WishlistPage from "./pages/Wishlist.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<AuthCallback />} />

                {/* everything inside here gets the nav */}
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/artist/:id" element={<ArtistPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/collection" element={<CollectionPage />} />

                </Route>
            </Routes>
        </BrowserRouter>
    );
}