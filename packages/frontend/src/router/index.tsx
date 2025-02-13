import { Route, Routes } from "react-router";
import AppIndexPage from "../components/pages/AppIndexPage";
import IndexPage from "../components/pages/IndexPage";
import AppLayout from "../components/templates/AppLayout";

// Router Configuration
export const Router = () => {
    return (
        <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppIndexPage />} />
            </Route>
        </Routes>
    );
}; 