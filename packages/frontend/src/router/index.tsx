import { Link, NavLink, Outlet, Route, Routes } from "react-router";

// Layout Components
const AppLayout = () => (
    <div>
        Das ist die App:
        <Outlet />
    </div>
);

// Page Components
const HomePage = () => (
    <div className="text-3xl font-bold underline">
        Hello world! oder so
        <Link to="/test">Test</Link>
    </div>
);

const TestPage = () => (
    <div>
        Test
        <Link to="/">Back</Link>
        <Link to="/app">App</Link>
    </div>
);

const AppIndexPage = () => (
    <div>
        Index
        <NavLink to="test">Test</NavLink>
        <Link to="/test">AppTest</Link>
    </div>
);

const AppTestPage = () => (
    <div>Test</div>
);

// Router Configuration
export const Router = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppIndexPage />} />
                <Route path="test" element={<AppTestPage />} />
            </Route>
        </Routes>
    );
}; 