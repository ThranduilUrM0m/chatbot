import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import _useStore from '../../store';
import { io } from 'socket.io-client';
import axios from 'axios';

import PDashboard from './_pane/PDashboard';
import PUsers from './_pane/PUsers';
import PConversations from './_pane/PConversations';
import PAudit from './_pane/PAudit';
import PSettings from './_pane/PSettings';

import Dropdown from 'react-bootstrap/Dropdown';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faRightFromBracket, faCube, faUserGroup, faHandsClapping, faClockRotateLeft, faChartSimple } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

import 'simplebar-react/dist/simplebar.min.css';
import { faBell, faMessage } from '@fortawesome/free-regular-svg-icons';

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production')
    ? window.location.hostname
    : 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const Dashboard = (props) => {
    const _user = _useStore.useUserStore(state => state._user);
    const setUser = _useStore.useUserStore(state => state['_user_SET_STATE']);
    const setUserIsAuthenticated = _useStore.useUserStore(state => state['_userIsAuthenticated_SET_STATE']);

    /* For Notifications */
    /* Dropdown State Variables */
    const [_showNotificationDropdown, setShowNotificationDropdown] = useState(false);


    const _notifications = _useStore.useNotificationStore((state) => state._notifications);
    const setNotifications = _useStore.useNotificationStore((state) => state["_notifications_SET_STATE"]);

    const _getNotifications = useCallback(async () => {
        try {
            axios("/api/notification")
                .then((response) => {
                    setNotifications(response.data._notifications);
                })
                .catch((error) => {
                    console.log(error);
                });
        } catch (error) {
            console.log(error);
        }
    }, [setNotifications]);
    /* For Notifications */

    let location = useLocation();
    let navigate = useNavigate();

    /* Notification Dropdown State Variables */
    const [_showDropdown, setShowDropdown] = useState(false);


    const _handleLogout = async () => {
        return axios.post(`/api/user/_logout/${_user._id}`, _user)
            .then((response) => {
                localStorage.setItem('jwtToken', '');

                setUser({});
                setUserIsAuthenticated(false);
                _socket.emit('action', { type: '_userDisonnected', data: response.data._user });
                navigate('/login', { replace: true, state: { from: location } });
            })
            .catch((error) => {
                console.log(error);
            });
    }

    const checkAuthentication = useCallback(async () => {
        try {
            // Check if the token is valid by calling the new endpoint
            return await axios.get('/api/user/_checkToken', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('jwtToken')}`,
                },
            })
                .then((response) => {
                    return response.data._user
                })
                .catch((error) => {
                    return false;
                });
        } catch (error) {
            return false;
        }
    }, []);

    useEffect(() => {
        _getNotifications();

        const checkUserAuthentication = async () => {
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                localStorage.removeItem('jwtToken');

                setUser({});
                setUserIsAuthenticated(false);
                _socket.emit('action', { type: '_userDisonnectedRefresh', data: _user });
                navigate('/login', { replace: true, state: { from: location } });
            }
        };
        checkUserAuthentication();
    }, [checkAuthentication, location, navigate, setUserIsAuthenticated, setUser, _getNotifications]);

    return (
        <main className='_dashboard'>
            <section className='_s1 grid'>
                <Tab.Container defaultActiveKey='_blog'>
                    <div className='g-col-2'>
                        <Nav variant='pills' className='flex-column'>
                            <Nav.Item>
                                <NavLink to='/' className='logo d-flex align-items-center justify-content-center'>
                                    <img className='img-fluid' src='https://cdg.ma/themes/cdg/logo.svg' alt='HelpAI CDG' />
                                </NavLink>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link className='d-flex align-items-start' eventKey='_dashboard'>
                                    <FontAwesomeIcon icon={faCube} />
                                    <p>Dashboard<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link className='d-flex align-items-start' eventKey='_users'>
                                    <FontAwesomeIcon icon={faUserGroup} />
                                    <p>Utilisateurs<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link className='d-flex align-items-start' eventKey='_conversations'>
                                    <FontAwesomeIcon icon={faMessage} />
                                    <p>Conversations<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link className='d-flex align-items-start' eventKey='_audit'>
                                    <FontAwesomeIcon icon={faChartSimple} />
                                    <p>Audit<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>

                            <Nav.Item
                                className='mt-auto'
                                onClick={() => _handleLogout()}
                            >
                                <Nav.Link className='d-flex align-items-start'>
                                    <FontAwesomeIcon icon={faRightFromBracket} />
                                    <p>Se déconnecter<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </div>
                    <div className='g-col-10 d-flex flex-column'>
                        <Nav className='align-items-center'>
                            <Nav.Item className='_welcome d-flex'>
                                <div className='d-flex flex-column align-items-start justify-content-center'>
                                    <span className='d-flex'>
                                        <p className='m-0 text-muted'>Hello, {_.isEmpty(_user._user_lastname) && _.isEmpty(_user._user_firstname) ? _.capitalize(_user._user_username) : (!_.isEmpty(_user._user_lastname) ? _user._user_lastname + ' ' + _user._user_firstname : _user._user_firstname)}</p>
                                        <FontAwesomeIcon icon={faHandsClapping} />
                                    </span>
                                    <span className='d-flex flex-column'>
                                        <p className='m-0'>{_.capitalize(_user._user_email)}</p>
                                        <p className='m-0'>{_.join(_.map(_user.Permission, __p => _.capitalize(__p._permission_titre)), ', ')}</p>
                                    </span>
                                </div>
                            </Nav.Item>
                            <Nav.Item className='_settings ms-auto'>
                                <Nav.Link className='d-flex align-items-start' eventKey='_settings'>
                                    <FontAwesomeIcon className='m-auto' icon={faGear} />
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item className='_motifications'>
                                <Dropdown
                                    show={_showNotificationDropdown}
                                    onMouseEnter={() => setShowNotificationDropdown(true)}
                                    onMouseLeave={() => setShowNotificationDropdown(false)}
                                >
                                    <Dropdown.Toggle as='span'>
                                        <span className='d-flex align-items-center justify-content-center'>
                                            <FontAwesomeIcon className='m-auto' icon={faBell} />
                                            <span className='hover_effect'></span>
                                        </span>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className='border rounded-0'>
                                    {
                                        _.map(_notifications, (_notification, _index) => {
                                            return (
                                                <Dropdown.Item key={_index} className='d-flex align-items-center' as='span'>
                                                    <p className='m-0'>{_notification._notification_title}</p>
                                                </Dropdown.Item>
                                            );
                                        })
                                    }
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Nav.Item>
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey='_dashboard'>
                                <PDashboard />
                            </Tab.Pane>
                            <Tab.Pane eventKey='_users'>
                                <PUsers />
                            </Tab.Pane>
                            <Tab.Pane eventKey='_conversations'>
                                <PConversations />
                            </Tab.Pane>
                            <Tab.Pane eventKey='_audit'>
                                <PAudit />
                            </Tab.Pane>
                            <Tab.Pane eventKey='_settings'>
                                <PSettings />
                            </Tab.Pane>
                        </Tab.Content>
                    </div>
                </Tab.Container>
            </section>
        </main>
    );
}

export default Dashboard;