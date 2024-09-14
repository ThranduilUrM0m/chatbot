import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import axios from 'axios';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPhone, } from '@fortawesome/free-solid-svg-icons';
import { faEnvelope, faRectangleXmark, faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import _ from 'lodash';
import $ from 'jquery';

const Inquiry = (props) => {
    const _validationSchema = Yup
        .object()
        .shape({
            _name: Yup.string()
                .default('')
                .required('Please provide a valid name.')
                .test('min-length', 'Must be at least 2 characters.', value => value && value.length >= 2)
                .matches(/^[a-zA-Z\s]*$/i, 'No numbers or symbols.'),
            _phone: Yup.string()
                .default('')
                .required('Phone number missing.')
                .matches(/^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/, 'No letters or symbols.'),
            _emailSender: Yup.string()
                .default('')
                .required('Email missing.')
                .matches(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, 'Email invalid.'),
            _message: Yup.string()
                .default('')
                .required('Please provide a message.'),
            _newsletter: Yup.boolean()
                .default(false)
        })
        .required();
    const {
        register,
        handleSubmit,
        watch,
        reset,
        resetField,
        trigger,
        formState: { errors }
    } = useForm({
        mode: 'onChange',
        reValidateMode: 'onSubmit',
        resolver: yupResolver(_validationSchema),
        defaultValues: {
            _name: '',
            _phone: '',
            _emailSender: '',
            _message: '',
            _newsletter: false
        }
    });

    /* Focus State Variables */
    const [_userNameFocused, setUserNameFocused] = useState(false);
    const [_userPhoneFocused, setUserPhoneFocused] = useState(false);
    const [_userEmailFocused, setUserEmailFocused] = useState(false);
    const [_userMessageFocused, setUserMessageFocused] = useState(false);

    /* Modal State Variables */
    const [_showModal, setShowModal] = useState(false);
    const [_modalHeader, setModalHeader] = useState('');
    const [_modalBody, setModalBody] = useState('');
    const [_modalIcon, setModalIcon] = useState('');

    const _handleAlphabet = useCallback(
        async () => {
            let doc = document,
                docElem = doc.documentElement;
            let gridWidth;
            let gridHeight;
            let letterWidth = _.round(docElem.clientWidth / _.round(docElem.clientWidth / 30)); // @todo: make this dynamic
            let letterHeight = _.round(docElem.clientWidth / _.round(docElem.clientWidth / 30)); // @todo: make this dynamic
            let totalLetters;
            let letterArray = [];
            let currentLetters = 0;

            let charCodeRange = {
                start: 48,
                end: 49
            };

            // get the grid's width and height

            const getDimensions = () => {
                gridWidth = docElem.clientWidth;
                gridHeight = docElem.clientHeight;
            }

            // get the total possible letters needed to fill the grid
            // and store that in totalLetters

            const getTotalLetters = () => {
                let multiplierX = Math.round(gridWidth / letterWidth);
                let multiplierY = Math.round(gridHeight / letterHeight);
                totalLetters = Math.round(multiplierX * multiplierY);
            }

            // loop through the unicode values and push each character into letterArray

            const populateLetters = () => {
                for (let i = charCodeRange.start; i <= charCodeRange.end; i++) {
                    letterArray.push(String.fromCharCode(i));
                }
            }

            // a function to loop a given number of times (value), each time
            // appending a letter from the letter array to the grid

            const drawLetters = (value) => {
                let text;
                let span;
                let count = 0;

                for (let letter = 0; letter <= value; letter++) {
                    text = document.createTextNode(letterArray[count]);
                    span = document.createElement('span');
                    span.appendChild(text);
                    $('.letter-grid').append(span);
                    count++;

                    // if our count equals the length of our letter array, then that
                    // means we've reached the end of the array (Z), so we set count to 
                    // zero again in order to start from the beginning of the array (A).
                    // we keep looping over the letter array 'value' number of times.

                    if (count === letterArray.length) {
                        count = 0;
                    }

                    // if our for counter let (letter) equals the passed in value argument
                    // then we've finished our loop and we throw a class onto the grid element

                    if (letter === value) {
                        $('.letter-grid').addClass('js-show-letters');
                    }
                }
            }

            // get the length of the grid.find('span') jQuery object
            // essentially the current number of letters in the grid at this point

            const getCurrentLetters = () => {
                currentLetters = $('.letter-grid').find('span').length;
            }

            const init = () => {
                populateLetters();
                getDimensions();
                getTotalLetters();
                drawLetters(totalLetters);
                getCurrentLetters();
            }

            const onResize = () => {
                getDimensions();
                getTotalLetters();
                if (currentLetters < totalLetters) {
                    let difference = totalLetters - currentLetters;
                    drawLetters(difference);
                }
                getCurrentLetters();
            }

            init();

            window.addEventListener('resize', _.debounce(onResize, 100));
        },
        []
    );

    const onSubmit = async (values) => {
        try {
            return axios.post('/api/user/_sendMessage', values)
                .then((response) => {
                    setModalHeader('Hello ✔ and Thank You !');
                    setModalBody('Hello and welcome our stranger, Thank you for reaching out to us, \nHow about you joins us, not only you can give a feedback, but you can discover much more about our community.');
                    setModalIcon(<FontAwesomeIcon icon={faSquareCheck} />);
                    setShowModal(true);
                })
                .then(() => {
                    reset({
                        _name: '',
                        _phone: '',
                        _emailSender: '',
                        _message: '',
                        _newsletter: false
                    });
                })
                .catch((error) => {
                    setModalHeader('We\'re sorry !');
                    setModalBody('Something wrong in your information has blocked this message from being sent');
                    setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                    setShowModal(true);
                });
        } catch (error) {
            setModalHeader('We\'re sorry !');
            setModalBody(JSON.stringify(error));
            setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
            setShowModal(true);
        }
    }

    const onError = (error) => {
        setModalHeader('We\'re sorry !');
        setModalBody('Please check the fields for valid information.');
        setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
        setShowModal(true);
    };

    useEffect(() => {
        _handleAlphabet();

        const subscription = watch((value, { name, type }) => { });
        return () => subscription.unsubscribe();
    }, [_handleAlphabet, watch]);

    return (
        <section className={props.className}>
            <div className='letter-grid d-flex justify-content-center flex-wrap text-center'></div>
            <div className='g-col-12'>
                <div className='before'></div>
            </div>
            <div className='g-col-12 grid'>
                <div className='g-col-4 d-flex flex-column justify-content-center align-items-center'>
                    <div className='text-center'>
                        <h5>Other ways to get in touch</h5>
                    </div>
                    <div className='grid align-items-start'>
                        <FontAwesomeIcon icon={faLocationDot} />
                        <span className='w-100 g-col-11'>
                            <p>Maroc</p>
                            <p>Meknès,</p>
                            <p>Av Marjane 1.</p>
                        </span>
                    </div>
                    <div className='grid align-items-start'>
                        <FontAwesomeIcon icon={faPhone} />
                        <span className='w-100 g-col-11'>
                            <p>(+212) 6 54 52 84 92</p>
                        </span>
                    </div>
                    <div className='grid align-items-start'>
                        <FontAwesomeIcon icon={faEnvelope} />
                        <span className='w-100 g-col-11'>
                            <p>contact@boutaleb.dev</p>
                        </span>
                    </div>
                </div>
                <div className='g-col-8'>
                    <Form onSubmit={handleSubmit(onSubmit, onError)} className='grid'>
                        <Row className='g-col-12 grid'>
                            <Col className='g-col-6'>
                                <Form.Group
                                    controlId='_name'
                                    className={`_formGroup ${_userNameFocused ? 'focused' : ''}`}
                                >
                                    <FloatingLabel
                                        label='Name.'
                                        className='_formLabel'
                                    >
                                        <Form.Control
                                            {...register('_name')}
                                            onBlur={() => {
                                                setUserNameFocused(false);
                                                trigger('_name');
                                            }}
                                            onFocus={() => setUserNameFocused(true)}
                                            placeholder='Name.'
                                            autoComplete='new-password'
                                            type='text'
                                            className={`_formControl border rounded-0 ${errors._name ? 'border-danger' : ''}`}
                                            name='_name'
                                        />
                                        {
                                            errors._name && (
                                                <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watch('_name')) ? '_fieldNotEmpty' : ''}`}>
                                                    {errors._name.message}
                                                </Form.Text>
                                            )
                                        }
                                        {
                                            !_.isEmpty(watch('_name')) && (
                                                <div
                                                    className='__close'
                                                    onClick={() => { resetField('_name') }}
                                                >
                                                </div>
                                            )
                                        }
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                            <Col className='g-col-6'>
                                <Form.Group
                                    controlId='_phone'
                                    className={`_formGroup ${_userPhoneFocused ? 'focused' : ''}`}
                                >
                                    <FloatingLabel
                                        label='Phone.'
                                        className='_formLabel'
                                    >
                                        <Form.Control
                                            {...register('_phone')}
                                            onBlur={() => {
                                                setUserPhoneFocused(false);
                                                trigger('_phone');
                                            }}
                                            onFocus={() => setUserPhoneFocused(true)}
                                            placeholder='Phone.'
                                            autoComplete='new-password'
                                            type='text'
                                            className={`_formControl border rounded-0 ${errors._phone ? 'border-danger' : ''}`}
                                            name='_phone'
                                        />
                                        {
                                            errors._phone && (
                                                <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watch('_phone')) ? '_fieldNotEmpty' : ''}`}>
                                                    {errors._phone.message}
                                                </Form.Text>
                                            )
                                        }
                                        {
                                            !_.isEmpty(watch('_phone')) && (
                                                <div
                                                    className='__close'
                                                    onClick={() => { resetField('_phone'); }}
                                                >
                                                </div>
                                            )
                                        }
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className='g-col-12 grid'>
                            <Col className='g-col-6'>
                                <Form.Group
                                    controlId='_emailSender'
                                    className={`_formGroup ${_userEmailFocused ? 'focused' : ''}`}
                                >
                                    <FloatingLabel
                                        label='Email.'
                                        className='_formLabel'
                                    >
                                        <Form.Control
                                            {...register('_emailSender')}
                                            onBlur={() => {
                                                setUserEmailFocused(false);
                                                trigger('_emailSender');
                                            }}
                                            onFocus={() => setUserEmailFocused(true)}
                                            placeholder='Email.'
                                            autoComplete='new-password'
                                            type='text'
                                            className={`_formControl border rounded-0 ${errors._emailSender ? 'border-danger' : ''}`}
                                            name='_emailSender'
                                        />
                                        {
                                            errors._emailSender && (
                                                <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watch('_emailSender')) ? '_fieldNotEmpty' : ''}`}>
                                                    {errors._emailSender.message}
                                                </Form.Text>
                                            )
                                        }
                                        {
                                            !_.isEmpty(watch('_emailSender')) && (
                                                <div
                                                    className='__close'
                                                    onClick={() => { resetField('_emailSender'); }}
                                                >
                                                </div>
                                            )
                                        }
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                            <Col className='g-col-6'>
                                <Form.Group
                                    controlId='_newsletter'
                                    className='_formGroup _checkGroup'
                                >
                                    <FloatingLabel
                                        label='Subscribe to receive our newsletter.'
                                        className='_formLabel'
                                    >
                                        <Form.Check
                                            {...register('_newsletter')}
                                            type='switch'
                                            className='_formSwitch'
                                            name='_newsletter'
                                        />
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className='g-col-12 grid'>
                            <Col className='g-col-12'>
                                <Form.Group
                                    controlId='_message'
                                    className={`_formGroup ${_userMessageFocused ? 'focused' : ''}`}
                                >
                                    <FloatingLabel
                                        label='Message.'
                                        className='_formLabel'
                                    >
                                        <Form.Control
                                            {...register('_message')}
                                            onBlur={() => {
                                                setUserMessageFocused(false);
                                                trigger('_message');
                                            }}
                                            onFocus={() => setUserMessageFocused(true)}
                                            placeholder='Message.'
                                            as='textarea'
                                            autoComplete='new-password'
                                            type='text'
                                            className={`_formControl border rounded-0 ${errors._message ? 'border-danger' : ''}`}
                                            name='_message'
                                        />
                                        {
                                            errors._message && (
                                                <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watch('_message')) ? '_fieldNotEmpty' : ''}`}>
                                                    {errors._message.message}
                                                </Form.Text>
                                            )
                                        }
                                        {
                                            !_.isEmpty(watch('_message')) && (
                                                <div
                                                    className='__close _messageInput'
                                                    onClick={() => { resetField('_message'); }}
                                                >
                                                </div>
                                            )
                                        }
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className='g-col-12 d-flex justify-content-end'>
                            <Button
                                type='submit'
                                className='border border-0 rounded-0 inverse w-25'
                                variant='outline-light'
                            >
                                <div className='buttonBorders'>
                                    <div className='borderTop'></div>
                                    <div className='borderRight'></div>
                                    <div className='borderBottom'></div>
                                    <div className='borderLeft'></div>
                                </div>
                                <span>
                                    Send Message<b className='pink_dot'>.</b>
                                </span>
                            </Button>
                        </Row>
                    </Form>
                </div>
            </div>

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
                            className='border border-0 rounded-0 inverse w-25'
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
        </section>
    )
}

export default Inquiry;