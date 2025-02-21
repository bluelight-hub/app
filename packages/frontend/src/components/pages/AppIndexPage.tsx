import { Link, NavLink } from "react-router";

/**
 * AppIndexPage - Main page for the app section
 */
const AppIndexPage: React.FC = () => {
    return (
        <div className="flex flex-col gap-4">
            Index
            <NavLink to="einsatztagebuch">Einsatztagebuch</NavLink>
            <Link to="einsatztagebuch">AppTest</Link>
        </div>
    );
};

export default AppIndexPage; 