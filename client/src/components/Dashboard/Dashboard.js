import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import _useStore from '../../store';
import { io } from 'socket.io-client';
import axios from 'axios';

import PDashboard from './_pane/PDashboard';
import PUsers from './_pane/PUsers';
import PSettings from './_pane/PSettings';

import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faRightFromBracket, faCube, faUserGroup, faHandsClapping, faClockRotateLeft, faBraille, faChartSimple } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

import 'simplebar-react/dist/simplebar.min.css';

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production')
    ? window.location.hostname
    : 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const Dashboard = (props) => {
    const _user = _useStore.useUserStore(state => state._user);
    const setUser = _useStore.useUserStore(state => state['_user_SET_STATE']);
    const setUserIsAuthenticated = _useStore.useUserStore(state => state['_userIsAuthenticated_SET_STATE']);

    let location = useLocation();
    let navigate = useNavigate();

    /* Dropdown State Variables */
    const [_showDropdown, setShowDropdown] = useState(false);

    /* Modal State Variables */
    const [_showModal, setShowModal] = useState(false);
    const [_modalHeader, setModalHeader] = useState('');
    const [_modalBody, setModalBody] = useState('');
    const [_modalIcon, setModalIcon] = useState('');


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

    const [timeoutId, setTimeoutId] = useState(null);
    const handleMouseEnter = () => {
        clearTimeout(timeoutId);
        setShowDropdown(true);
    };

    const handleMouseLeave = () => {
        const id = setTimeout(() => setShowDropdown(false), 500); // 500ms delay
        setTimeoutId(id);
    };

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
    }, [checkAuthentication, location, navigate, setUserIsAuthenticated, setUser]);

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
                                    <FontAwesomeIcon icon={faClockRotateLeft} />
                                    <p>Conversations<b className='pink_dot'>.</b></p>
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link className='d-flex align-items-start' eventKey='_tracabilite'>
                                    <FontAwesomeIcon icon={faBraille} />
                                    <p>Traçabilité<b className='pink_dot'>.</b></p>
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
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey='_dashboard'>
                                <PDashboard />
                            </Tab.Pane>

                            <Tab.Pane eventKey='_users'>
                                <PUsers />
                            </Tab.Pane>
                            <Tab.Pane eventKey='_settings'>
                                <PSettings />
                            </Tab.Pane>
                        </Tab.Content>
                    </div>
                </Tab.Container>
            </section>

            <Modal show={_showModal} onHide={() => setShowModal(false)} centered>
                <Form>
                    <Modal.Header closeButton>
                        <Modal.Title>{_modalHeader}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className='text-muted'><pre>{_modalBody}</pre></Modal.Body>
                    <Modal.Footer>
                        {_modalIcon}
                        <Button
                            type='button'
                            className='border border-0 rounded-0 inverse w-50'
                            variant='outline-light'
                            onClick={() => setShowModal(false)}
                        >
                            <div className='buttonBorders'>
                                <div className='borderTop'></div>
                                <div className='borderRight'></div>
                                <div className='borderBottom'></div>
                                <div className='borderLeft'></div>
                            </div>
                            <span>
                                Close<b className='pink_dot'>.</b>
                            </span>
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </main>
    );
}

export default Dashboard;