import React from 'react';
import {
    Outlet,
    useLocation
} from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const Layout = (props) => {
    let location = useLocation();

    return (
        <>
            {/* Header needs a scroll effect so that when i scroll down, it stays visible */}

            {/* A 'layout route' is a good place to put markup you want to
                share across all the pages on your site, like navigation. */}
            {
                location.pathname !== '/dashboard' && (
                    <Header />
                )
            }
            {/* An <Outlet> renders whatever child route is currently active,
                so you can think about this <Outlet> as a placeholder for
                the child routes we defined above. */}
            <Outlet />
            {
                location.pathname !== '/dashboard' && (
                    <Footer />
                )
            }
        </>
    );
}

export default Layout;