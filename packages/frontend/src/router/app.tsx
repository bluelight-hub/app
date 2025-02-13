import { Route } from "react-router";
import AppIndexPage from "../components/pages/AppIndexPage";

// App Router Configuration
export const AppRouter = () => {
    return (
        <Route index element={<AppIndexPage />} />
    );
};
