import { Link, NavLink } from "react-router";

/**
 * AppIndexPage - Main page for the app section
 */
const AppIndexPage: React.FC = () => {
    return (
        <div>
            Index
            <NavLink to="test">Test</NavLink>
            <Link to="/test">AppTest</Link>
        </div>
    );
};

export default AppIndexPage; 