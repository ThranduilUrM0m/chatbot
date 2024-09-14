import React, { useCallback, useEffect, useState } from 'react';
import _useStore from '../../store';
import {
	useNavigate,
	useLocation
} from 'react-router-dom';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRectangleXmark, faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import _ from 'lodash';
import { io } from 'socket.io-client';

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production')
	? window.location.hostname
	: 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const usePersistentFingerprint = () => {
	const [_fingerprint, setFingerprint] = useState('');

	useEffect(() => {
		const generateFingerprint = async () => {
			// Check if the persistent identifier exists in storage (e.g., cookie or local storage)
			const persistentIdentifier = localStorage.getItem('persistentIdentifier');

			if (persistentIdentifier) {
				// Use the persistent identifier if available
				setFingerprint(persistentIdentifier);
			} else {
				// Fallback to generating a new fingerprint using FingerprintJS
				const fp = await FingerprintJS.load();
				const { visitorId } = await fp.get();
				setFingerprint(visitorId);

				// Store the persistent identifier for future visits
				localStorage.setItem('persistentIdentifier', visitorId);
			}
		};

		generateFingerprint();
	}, []);

	return _fingerprint;
};

const Signup = (props) => {
	const addUser = _useStore.useUserStore(state => state['_user_ADD_STATE']);
	const setUser = _useStore.useUserStore(state => state['_user_SET_STATE']);
	const setUserIsAuthenticated = _useStore.useUserStore(state => state['_userIsAuthenticated_SET_STATE']);

	/* In this Component the _fingerprint variable is not needed at load, so it's working fine,
	but what if someday the user is using somethin to block it or it just doesn't work,
	i'll have to make sure the field can be empty at axios calls */
	const _fingerprint = usePersistentFingerprint();
	/* const [isFingerprintLoaded, setIsFingerprintLoaded] = useState(false); */

	let location = useLocation();
	let navigate = useNavigate();

	const _validationSchema = Yup
		.object()
		.shape({
			_user_email: Yup.string()
				.default('')
				.required('Email missing.')
				.matches(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, 'Email invalid.'),
			_user_username: Yup.string()
				.default('')
				.required('Username missing.')
				.matches(/^[a-zA-Z0-9_]{3,20}$/, 'Username must be 3 to 20 long..'),
			_user_password: Yup.string()
				.default('')
				.required('Password missing.')
				.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/, 'Password must contain at least 1 upper and 1 lowercase letter, 1 number and 1 symbol.'),
			_user_passwordConfirm: Yup.string()
				.default('')
				.required('Confirmation missing.')
				.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/, 'Password must contain at least 1 upper and 1 lowercase letter, 1 number and 1 symbol.'),
		})
		.required();
	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors }
	} = useForm({
		mode: 'onTouched',
		reValidateMode: 'onChange',
		resolver: yupResolver(_validationSchema),
		defaultValues: {
			_user_email: '',
			_user_username: '',
			_user_password: '',
			_user_passwordConfirm: ''
		}
	});

	const [_userEmailFocused, setUserEmailFocused] = useState(false);
	const [_userNameFocused, setUserUsernameFocused] = useState(false);
	const [_userPasswordFocused, setUserPasswordFocused] = useState(false);
	const [_userPasswordConfirmFocused, setUserPasswordConfirmFocused] = useState(false);

	const [_showModal, setShowModal] = useState(false);
	const [_modalHeader, setModalHeader] = useState('');
	const [_modalBody, setModalBody] = useState('');
	const [_modalIcon, setModalIcon] = useState('');

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

	const onSubmit = async (values) => {
		values._user_fingerprint = _fingerprint;

		try {
			if (values._user_password !== values._user_passwordConfirm) throw new Error('Please check your password confirmation');
			return axios.post('/api/user', values)
				.then((response) => {
					addUser(response.data);
					_socket.emit('action', { type: '_userCreated', data: response.data._user });
					setModalHeader('Hello ✔ and Welcome !');
					setModalBody('We have sent you a verification email, all you have to do next is just click the link in the email and boom you are one of us now.');
					setModalIcon(<FontAwesomeIcon icon={faSquareCheck} />);
					setShowModal(true);
				})
				.then(() => {
					reset({
						_user_email: '',
						_user_username: '',
						_user_password: '',
						_user_passwordConfirm: ''
					});
				})
				.catch((error) => {
					setModalHeader('We\'re sorry !');
					setModalBody(error.response.data.text);
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
		setModalBody(error);
		setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
		setShowModal(true);
	};

	const _toLogin = async (event) => {
		event.preventDefault();
		navigate('/login', { replace: true, state: { from: location } });
	}

	useEffect(() => {
		const checkUserAuthentication = async () => {
			const isAuthenticated = await checkAuthentication();
			if (isAuthenticated) {
				setUser(isAuthenticated);
				setUserIsAuthenticated(true);
				navigate('/dashboard', { replace: true, state: { from: location } });
			}
		};
		checkUserAuthentication();

		const subscription = watch((value, { name, type }) => { });
		return () => subscription.unsubscribe();
	}, [checkAuthentication, watch, setUser, location, navigate, setUserIsAuthenticated]);

	return (
		<main className='_signup'>
			<section className='grid'>
				<div className='g-col-6 d-flex justify-content-center align-items-center'>
					<Card className='border border-0 rounded-0'>
						<Card.Header className='rounded-0'>
							<h4>Login<b className='pink_dot'>.</b></h4>
						</Card.Header>
						<Card.Body>
							<Form className='d-flex flex-column justify-content-center align-items-start' onSubmit={(event) => _toLogin(event)}>
								<h6>Welcome to boutaleb.</h6>
								<p>To speak louder.</p>
								<Button
									type='submit'
									className='border border-0 rounded-0 w-100'
									variant='outline-light'
								>
									<div className='buttonBorders'>
										<div className='borderTop'></div>
										<div className='borderRight'></div>
										<div className='borderBottom'></div>
										<div className='borderLeft'></div>
									</div>
									<span>
										Login<b className='pink_dot'>.</b>
									</span>
								</Button>
							</Form>
						</Card.Body>
					</Card>
				</div>
				<div className='g-col-6 d-flex justify-content-center align-items-center'>
					<Card className='border border-0 rounded-0'>
						<Card.Header className='rounded-0'>
							<h3>Signup<b className='pink_dot'>.</b></h3>
						</Card.Header>
						<Card.Body>
							<Form onSubmit={handleSubmit(onSubmit, onError)} className='grid'>
								<Row className='g-col-12'>
									<Form.Group
										controlId='_user_email'
										className={`_formGroup ${_userEmailFocused ? 'focused' : ''}`}
									>
										<FloatingLabel
											label='Email.'
											className='_formLabel'
										>
											<Form.Control
												{...register('_user_email')}
												onBlur={() => setUserEmailFocused(false)}
												onFocus={() => setUserEmailFocused(true)}
												placeholder='Email.'
												autoComplete='new-password'
												type='text'
												className={`_formControl border rounded-0 ${errors._user_email ? 'border-danger' : ''}`}
												name='_user_email'
											/>
											{
												errors._user_email && (
													<Form.Text className={`bg-danger d-flex align-items-center text-white bg-opacity-75 ${!_.isEmpty(watch('_user_email')) ? '' : 'toClear'}`}>
														{errors._user_email.message}
													</Form.Text>
												)
											}
											{
												!_.isEmpty(watch('_user_email')) && (
													<div
														className='__close'
														onClick={() => { reset({ _user_email: '' }); }}
													>
													</div>
												)
											}
										</FloatingLabel>
									</Form.Group>
								</Row>
								<Row className='g-col-12'>
									<Form.Group
										controlId='_user_username'
										className={`_formGroup ${_userNameFocused ? 'focused' : ''}`}
									>
										<FloatingLabel
											label='Username.'
											className='_formLabel'
										>
											<Form.Control
												{...register('_user_username')}
												onBlur={() => setUserUsernameFocused(false)}
												onFocus={() => setUserUsernameFocused(true)}
												placeholder='Username.'
												autoComplete='new-password'
												type='text'
												className={`_formControl border rounded-0 ${errors._user_username ? 'border-danger' : ''}`}
												name='_user_username'
											/>
											{
												errors._user_username && (
													<Form.Text className={`bg-danger d-flex align-items-center text-white bg-opacity-75 ${!_.isEmpty(watch('_user_username')) ? '' : 'toClear'}`}>
														{errors._user_username.message}
													</Form.Text>
												)
											}
											{
												!_.isEmpty(watch('_user_username')) && (
													<div
														className='__close'
														onClick={() => { reset({ _user_username: '' }); }}
													>
													</div>
												)
											}
										</FloatingLabel>
									</Form.Group>
								</Row>
								<Row className='g-col-12'>
									<Form.Group
										controlId='_user_password'
										className={`_formGroup ${_userPasswordFocused ? 'focused' : ''}`}
									>
										<FloatingLabel
											label='Password.'
											className='_formLabel'
										>
											<Form.Control
												{...register('_user_password')}
												onBlur={() => setUserPasswordFocused(false)}
												onFocus={() => setUserPasswordFocused(true)}
												placeholder='Password.'
												autoComplete='new-password'
												type='password'
												className={`_formControl border rounded-0 ${errors._user_password ? 'border-danger' : ''}`}
												name='_user_password'
											/>
											{
												errors._user_password && (
													<Form.Text className={`bg-danger d-flex align-items-center text-white bg-opacity-75 ${!_.isEmpty(watch('_user_password')) ? '' : 'toClear'}`}>
														{errors._user_password.message}
													</Form.Text>
												)
											}
											{
												!_.isEmpty(watch('_user_password')) && (
													<div
														className='__close'
														onClick={() => { reset({ _user_password: '' }); }}
													>
													</div>
												)
											}
										</FloatingLabel>
									</Form.Group>
								</Row>
								<Row className='g-col-12'>
									<Form.Group
										controlId='_user_passwordConfirm'
										className={`_formGroup ${_userPasswordConfirmFocused ? 'focused' : ''}`}
									>
										<FloatingLabel
											label='Confirm Password.'
											className='_formLabel'
										>
											<Form.Control
												{...register('_user_passwordConfirm')}
												onBlur={() => setUserPasswordConfirmFocused(false)}
												onFocus={() => setUserPasswordConfirmFocused(true)}
												placeholder='Confirm Password.'
												autoComplete='new-password'
												type='password'
												className={`_formControl border rounded-0 ${errors._user_passwordConfirm ? 'border-danger' : ''}`}
												name='_user_passwordConfirm'
											/>
											{
												errors._user_passwordConfirm && (
													<Form.Text className={`bg-danger d-flex align-items-center text-white bg-opacity-75 ${!_.isEmpty(watch('_user_passwordConfirm')) ? '' : 'toClear'}`}>
														{errors._user_passwordConfirm.message}
													</Form.Text>
												)
											}
											{
												!_.isEmpty(watch('_user_passwordConfirm')) && (
													<div
														className='__close'
														onClick={() => { reset({ _user_passwordConfirm: '' }); }}
													>
													</div>
												)
											}
										</FloatingLabel>
									</Form.Group>
								</Row>
								<Row className='g-col-12'>
									<Button
										type='submit'
										className='border border-0 rounded-0 w-100'
										variant='outline-light'
									>
										<div className='buttonBorders'>
											<div className='borderTop'></div>
											<div className='borderRight'></div>
											<div className='borderBottom'></div>
											<div className='borderLeft'></div>
										</div>
										<span>
											signup<b className='pink_dot'>.</b>
										</span>
									</Button>
								</Row>
							</Form>
						</Card.Body>
					</Card>
				</div>
			</section>

			<Modal show={_showModal} onHide={() => setShowModal(false)} centered>
				<Form>
					<Modal.Header closeButton>
						<Modal.Title>{_modalHeader}</Modal.Title>
					</Modal.Header>
					<Modal.Body className='text-muted'><pre>{_modalBody}</pre></Modal.Body>
					<Modal.Footer>
						{_modalIcon}
						<Button className='border border-0 rounded-0 inverse w-50' variant='outline-light' onClick={() => setShowModal(false)}>
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

export default Signup;