import React from 'react';
import {
    useLocation
} from 'react-router-dom';
import Moment from 'react-moment';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faCopyright } from '@fortawesome/free-regular-svg-icons';

const Footer = (props) => {
    let location = useLocation();

    return (
        <footer className={location.pathname === '/dashboard' ? '_dashboard' : ''}>
            <Container fluid>
                <Row className='grid'>
                    <Col className='g-col-6'>
                        <ul className='list-inline'>
                            <li className='list-inline-item'>
                                <a className='hoverEffect' href='#'>Instagram</a>
                            </li>
                            <li className='list-inline-item'>
                                <a className='hoverEffect' href='#'>Facebook</a>
                            </li>
                            <li className='list-inline-item'>
                                <a className='hoverEffect' href='#'>Behance</a>
                            </li>
                            <li className='list-inline-item'>
                                <FontAwesomeIcon icon={faCopyright} />
                                <span>{<Moment local format='YYYY' date={new Date()} />}</span> - With <FontAwesomeIcon icon={faHeart} /> from Dev.
                            </li>
                        </ul>
                    </Col>
                    <Col className='g-col-6 d-flex justify-content-end'>
                        <ul className='list-inline'>
                            <li className='list-inline-item'>
                                <a className='hoverEffect' href='# '>Legal Notice</a>
                            </li>
                            <li className='list-inline-item'>
                                <a className='hoverEffect' href='# '>Newsroom</a>
                            </li>
                            <li className='list-inline-item'>
                                <span className='name'>Dev.</span>
                            </li>
                        </ul>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
}

export default Footer;