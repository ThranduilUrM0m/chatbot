import React, { useEffect, useState } from 'react';
import {
    useNavigate,
    useLocation,
    useParams
} from 'react-router-dom';
import axios from 'axios';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRectangleXmark, faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import _ from 'lodash';
import { io } from 'socket.io-client';

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production')
    ? window.location.hostname
    : 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const Confirmation = (props) => {
    let location = useLocation();
    let navigate = useNavigate();
    let { _tokenID } = useParams();

    const [_showModal, setShowModal] = useState(true);
    const [_modalHeader, setModalHeader] = useState('');
    const [_modalBody, setModalBody] = useState('');
    const [_modalIcon, setModalIcon] = useState('');

    useEffect(() => {
        _confirmation();
    }, []);

    const _confirmation = async () => {
        try {
            return axios.post('/api/user/_confirm', { _tokenID })
                .then((response) => {
                    _socket.emit('action', { type: '_userConfirmed', data: response.data._user });
                    setModalHeader('Hello ✔ and Welcome !');
                    setModalBody(response.data.text);
                    setModalIcon(<FontAwesomeIcon icon={faSquareCheck} />);
                    setShowModal(true);
                })
                .catch((error) => {
                    if (error.response && error.response.status === 400) {
                        setModalHeader('We\'re sorry!');
                        setModalBody(error.response.data.text);
                        setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                        setShowModal(true);
                    } else {
                        console.error(error); // Print the error to the console for debugging purposes
                    }
                });
        } catch (error) {
            setModalHeader('We\'re sorry !');
            setModalBody(JSON.stringify(error));
            setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
            setShowModal(true);
        }
    }

    const _handleClose = () => {
        setShowModal(false);
        navigate('/login', { replace: true, state: { from: location } });
    }

    return (
        <main className='_confirmation'>
            <Modal show={_showModal} onHide={() => _handleClose()} centered>
                <Form>
                    <Modal.Header closeButton>
                        <Modal.Title>{_modalHeader}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className='text-muted'><pre>{_modalBody}</pre></Modal.Body>
                    <Modal.Footer>
                        {_modalIcon}
                        <Button className='border border-0 rounded-0 inverse w-50 ml-1' variant='outline-light' onClick={() => _handleClose()}>
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
    )
}

export default Confirmation;