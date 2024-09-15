import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import _useStore from '../../../store';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import ListGroup from 'react-bootstrap/ListGroup';
import { useCombobox } from 'downshift';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { io } from 'socket.io-client';
import _ from 'lodash';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faPen } from '@fortawesome/free-solid-svg-icons';
import { faRectangleXmark } from '@fortawesome/free-regular-svg-icons';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

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

const PSettings = (props) => {
    const _user = _useStore.useUserStore(state => state._user);
    const setUser = _useStore.useUserStore(state => state['_user_SET_STATE']);
    const _userToEdit = _useStore.useUserStore(state => state._userToEdit);
    const setUserToEdit = _useStore.useUserStore(state => state['_userToEdit_SET_STATE']);
    const clearUserToEdit = _useStore.useUserStore(state => state['_userToEdit_CLEAR_STATE']);
    const _fingerprint = usePersistentFingerprint();
    
    const _validationSchemaSettings = Yup
        .object()
        .shape({
            _user_email: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-email',
                    'Email invalid.',
                    __email => !__email || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(__email)
                ),
            _user_username: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-username',
                    'Must be 3 to 20 long.',
                    __username => !__username || /^[a-zA-Z0-9_]{3,20}$/.test(__username)
                ),
            _user_password: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-password',
                    'At least 1 upper and 1 lowercase letter, 1 number and 1 symbol.',
                    __password => !__password || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/.test(__password)
                ),
            _user_passwordNew: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-passwordNew',
                    'At least 1 upper and 1 lowercase letter, 1 number and 1 symbol.',
                    __passwordNew => !__passwordNew || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/.test(__passwordNew)
                ),
            _user_passwordNewConfirm: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-passwordNewConfirm',
                    'At least 1 upper and 1 lowercase letter, 1 number and 1 symbol.',
                    __passwordNewConfirm => !__passwordNewConfirm || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/.test(__passwordNewConfirm)
                ),
            _user_picture: Yup.string()
                .default(''),
            _user_firstname: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-firstname',
                    'No numbers or symbols.',
                    __firstname => !__firstname || /^[a-zA-Z\s]{2,}$/i.test(__firstname)
                ),
            _user_lastname: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-lastname',
                    'No numbers or symbols.',
                    __lastname => !__lastname || /^[a-zA-Z\s]{2,}$/i.test(__lastname)
                ),
            _user_city: Yup.string()
                .default(''),
            _user_country: Yup.object()
                .shape({
                    _code: Yup.string()
                        .default(''),
                    _country: Yup.string()
                        .default('')
                }),
            user_phone: Yup.string()
                .default('')
                .test(
                    'empty-or-valid-phone',
                    'Phone number invalid.',
                    __phone => !__phone || /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/.test(__phone)
                ),
            _user_toDelete: Yup.boolean()
                .default(false)
        });
    const {
        register: registerSettings,
        handleSubmit: handleSubmitSettings,
        watch: watchSettings,
        setValue: setValueSettings,
        control: controlSettings,
        setError: setErrorSettings,
        reset: resetSettings,
        resetField: resetFieldSettings,
        trigger: triggerSettings,
        formState: { errors: errorsSettings }
    } = useForm({
        mode: 'onChange',
        reValidateMode: 'onSubmit',
        resolver: yupResolver(_validationSchemaSettings),
        defaultValues: {
            _user_email: _user._user_email || '',
            _user_username: _user._user_username || '',
            _user_password: '',
            _user_passwordNew: '',
            _user_passwordNewConfirm: '',
            _user_picture: _user._user_picture || '',
            _user_firstname: _user._user_firstname || '',
            _user_lastname: _user._user_lastname || '',
            _user_city: _user._user_city || '',
            _user_country: _user._user_country || { _code: '', _country: '' },
            _user_phone: _user._user_phone || '',
            _user_toDelete: _user._user_toDelete || false
        }
    });

    /* Modal State Variables */
    const [_showModal, setShowModal] = useState(false);
    const [_modalHeader, setModalHeader] = useState('');
    const [_modalBody, setModalBody] = useState('');
    const [_modalIcon, setModalIcon] = useState('');

    /* Focus State Variables */
    const [_userEmailFocused, setUseremailFocused] = useState(false);
    const [_userUsernameFocused, setUserusernameFocused] = useState(false);
    const [_userFirstnameFocused, setUserfirstnameFocused] = useState(false);
    const [_userLastnameFocused, setUserlastnameFocused] = useState(false);
    const [_userCityFocused, setUsercityFocused] = useState(false);
    const [_userCountryFocused, setUsercountryFocused] = useState(false);
    const [_userPhoneFocused, setUserphoneFocused] = useState(false);
    const [_userPasswordFocused, setUserpasswordFocused] = useState(false);
    const [_userPasswordNewFocused, setUserpasswordNewFocused] = useState(false);
    const [_userPasswordNewConfirmFocused, setUserpasswordNewConfirmFocused] = useState(false);

    /* Countries and Cities State Variables */
    const [_countries, setCountries] = useState([]);
    const [_cities, setCities] = useState([]);


    /* Downshift _user_country */
    const [_typedCharactersCountry, setTypedCharactersCountry] = useState('');
    const [_countrySuggestion, setCountrySuggestion] = useState('');
    const [__countryItems, setCountryItems] = useState([]);
    const _handleSelectCountry = (__selectedItem) => {
        if (__selectedItem) {
            /* calling setValueSettings from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
            setValueSettings('_user_country', {
                _code: __selectedItem._code,
                _country: __selectedItem._country,
            });
            _handleChangeCountry(__selectedItem._country);
        }
    }
    const _handleChangeCountry = (__inputValue) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _countries,
                    (item) =>
                        !__inputValue ||
                        _.includes(
                            _.lowerCase(item._country),
                            _.lowerCase(__inputValue)
                        )
                ),
                '_country'
            ),
            ['_country'],
            ['asc']
        );

        setTypedCharactersCountry(__inputValue);
        setCountrySuggestion((!_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)) ? (firstSuggestions[0]._country) : '');
        setCountryItems(firstSuggestions);
        _getCities((!_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)) ? (firstSuggestions[0]._code) : '');
        if (!_.isEqual(_user?._user_country?._country, firstSuggestions[0]?._country)) {
            // If the suggestion picked is not the same as the _user's country
            setValueSettings('_user_city', '');
            _handleChangeCity('');
        }
    }
    const _handleBlurCountry = (__event) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _countries,
                    (item) =>
                        !__event.target.value ||
                        _.includes(
                            _.lowerCase(item._country),
                            _.lowerCase(__event.target.value)
                        )
                ),
                '_country'
            ),
            ['_country'],
            ['asc']
        );

        if (!_.isEmpty(__event.target.value)) {
            // If the user left the Form not empty
            if (!_.isEmpty(firstSuggestions)) {
                // If there is a valid suggestion
                setValueSettings('_user_country', {
                    _code: firstSuggestions[0]._code,
                    _country: firstSuggestions[0]._country,
                });
                _getCities(firstSuggestions[0]._code);
            } else {
                // If there is a no valid suggestion
                setErrorSettings('_user_country', {
                    type: 'manual',
                    message: 'Not a valid Country.'
                });
                _getCities('');
            }
        } else {
            // If the user left the Form empty
            setValueSettings('_user_country', { _code: '', _country: '' });
            _getCities('');
        }

        setTypedCharactersCountry('');
        setCountrySuggestion('');
        setCountryItems(__countryItems);
        if (!_.isEqual(_user?._user_country?._country, firstSuggestions[0]?._country)) {
            // If the suggestion picked is not the same as the _user's country
            setValueSettings('_user_city', '');
            _handleChangeCity('');
        }
        setUsercountryFocused(!_.isEmpty(watchSettings('_user_country._country')) ? true : false);
    }
    const _handleFocusCountry = () => {
        setUsercountryFocused(true);
    }
    const {
        getLabelProps: getLabelPropsCountry,
        getInputProps: getInputPropsCountry,
        getItemProps: getItemPropsCountry,
        getMenuProps: getMenuPropsCountry,
        highlightedIndex: highlightedIndexCountry,
        selectedItem: selectedItemCountry,
        isOpen: isOpenCountry
    } = useCombobox({
        items: __countryItems,
        onInputValueChange({ inputValue }) { _handleChangeCountry(inputValue) },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) => _handleSelectCountry(__selectedItem),
        itemToString: item => (item ? item._country : ''),
        stateReducer: (state, actionAndChanges) => {
            const { type, changes } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputClick:
                    return {
                        ...changes,
                        isOpen: true,
                    };
                default:
                    return changes;
            }
        }
    });
    /* Downshift _user_country */


    /* Downshift _user_city */
    const [_typedCharactersCity, setTypedCharactersCity] = useState('');
    const [_citySuggestion, setCitySuggestion] = useState('');
    const [__cityItems, setCityItems] = useState([]);
    const _handleSelectCity = (__selectedItem) => {
        if (__selectedItem) {
            /* calling setValueSettings from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
            setValueSettings('_user_city', __selectedItem._city);
            _handleChangeCity(__selectedItem._city);
        }
    }
    const _handleChangeCity = (__inputValue) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _cities,
                    (item) =>
                        !__inputValue ||
                        _.includes(
                            _.lowerCase(item._city),
                            _.lowerCase(__inputValue)
                        )
                ),
                '_city'
            ),
            ['_city'],
            ['asc']
        );

        setTypedCharactersCity(__inputValue);
        setCitySuggestion((!_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)) ? (firstSuggestions[0]._city) : '');
        setCityItems(firstSuggestions);
    }
    const _handleBlurCity = (__event) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _cities,
                    (item) =>
                        !__event.target.value ||
                        _.includes(
                            _.lowerCase(item._city),
                            _.lowerCase(__event.target.value)
                        )
                ),
                '_city'
            ),
            ['_city'],
            ['asc']
        );

        if (!_.isEmpty(__event.target.value)) {
            // If the user left the Form not empty
            if (!_.isEmpty(firstSuggestions)) {
                // If there is a valid suggestion
                setValueSettings('_user_city', firstSuggestions[0]._city);
            } else {
                // If there is a no valid suggestion
                setErrorSettings('_user_city', {
                    type: 'manual',
                    message: 'Not a valid City.'
                });
            }
        } else {
            // If the user left the Form empty
            setValueSettings('_user_city', '');
        }

        setTypedCharactersCity('');
        setCitySuggestion('');
        setCityItems(__cityItems);

        setUsercityFocused(!_.isEmpty(watchSettings('_user_city')) ? true : false);
    }
    const _handleFocusCity = () => {
        setUsercityFocused(true);
    }
    const {
        getLabelProps: getLabelPropsCity,
        getInputProps: getInputPropsCity,
        getItemProps: getItemPropsCity,
        getMenuProps: getMenuPropsCity,
        highlightedIndex: highlightedIndexCity,
        selectedItem: selectedItemCity,
        isOpen: isOpenCity
    } = useCombobox({
        items: __cityItems,
        onInputValueChange({ inputValue }) { _handleChangeCity(inputValue) },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) => _handleSelectCity(__selectedItem),
        itemToString: item => (item ? item._city : ''),
        stateReducer: (state, actionAndChanges) => {
            const { type, changes } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputClick:
                    return {
                        ...changes,
                        isOpen: true,
                    };
                default:
                    return changes;
            }
        }
    });
    /* Downshift _user_city */


    const _getCities = useCallback(
        async (countryCode) => {
            try {
                !_.isEmpty(countryCode) &&
                    axios(`http://api.geonames.org/searchJSON?country=${countryCode}&username=thranduilurm0m`)
                        .then((response) => {
                            const data = response.data;
                            const cityList = _.map(data.geonames, (city) => {
                                // Check if the feature code corresponds to a city (you may need to adjust this condition based on the API response)
                                if (city.fcode !== 'RGN' && city.fcode !== 'PCLI' && city.fcode !== 'ADM1' && city.fcode !== 'ADM1H' && city.fcode !== 'AIRP') {
                                    return {
                                        _city: city.name,
                                    };
                                }
                                return null; // Return null for non-city entries
                            });
                            setCities(
                                _.orderBy(
                                    _.uniqBy(
                                        _.filter(cityList, (city) => city !== null),
                                        '_city'
                                    ),
                                    ['_city'],
                                    ['asc']
                                )
                            );
                            setCityItems(
                                _.orderBy(
                                    _.uniqBy(
                                        _.filter(cityList, (city) => city !== null),
                                        '_city'
                                    ),
                                    ['_city'],
                                    ['asc']
                                )
                            );
                        })
                        .catch((error) => {
                            console.log(error);
                        });
            } catch (error) {
                console.log(error);
            }
        },
        [setCities]
    );

    const _getCountries = useCallback(
        async () => {
            try {
                axios('https://restcountries.com/v3.1/all')
                    .then((response) => {
                        const data = response.data;
                        const countryList = _.map(data, country => ({
                            _country: country.name.common,
                            _code: country.cca2,
                            _flag: country.flags.svg
                        }));
                        setCountries(
                            _.orderBy(
                                _.uniqBy(
                                    countryList,
                                    '_country'
                                ),
                                ['_country'],
                                ['asc']
                            )
                        );
                        setCountryItems(
                            _.orderBy(
                                _.uniqBy(
                                    countryList,
                                    '_country'
                                ),
                                ['_country'],
                                ['asc']
                            )
                        );

                        !_.isEmpty(watchSettings('_user_country._country'))
                            ?
                            _getCities(watchSettings('_user_country._code'))
                            :
                            _getCities(countryList[0]?._code);
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            } catch (error) {
                console.log(error);
            }
        },
        [setCountries, watchSettings, _getCities]
    );

    const _handleEdit = (_index) => {
        setUserToEdit(_user);
    };

    const _handleCancel = (_index) => {
        // Reset the form fields
        resetSettings({
            _user_password: '',
            _user_passwordNew: '',
            _user_passwordNewConfirm: '',
        });

        clearUserToEdit();
    };

    const onSubmit = async (values) => {
        const formData = new FormData();
        values._user_fingerprint = _fingerprint;

        try {
            // Check if any of the password fields is not empty
            if (
                (values._user_password || values._user_passwordNew || values._user_passwordNewConfirm) &&
                (!values._user_password || !values._user_passwordNew || !values._user_passwordNewConfirm)
            ) {
                setErrorSettings('_user_password', {
                    type: 'manual',
                    message: 'This must be filled.'
                });
                setErrorSettings('_user_passwordNew', {
                    type: 'manual',
                    message: 'This must be filled.'
                });
                setErrorSettings('_user_passwordNewConfirm', {
                    type: 'manual',
                    message: 'This must be filled.'
                });
                return;
            }

            // Custom validation for password confirmation
            if (values._user_passwordNew !== values._user_passwordNewConfirm) {
                setErrorSettings('_user_passwordNewConfirm', {
                    type: 'manual',
                    message: 'Confirmation doesn\'t match.'
                });
                return;
            }

            for (const [key, value] of Object.entries(values)) {
                if (!_.isEmpty(value)) {
                    if (key === '_user_picture') {
                        formData.append(key, value[0]);
                    } else if (key === '_user_country') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, value);
                    }
                }
            }

            return axios.patch(`/api/user/${_userToEdit._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Important: set the content type to 'multipart/form-data'
                },
            })
                .then((res) => {
                    setUser(res.data._user);
                    _socket.emit('action', { type: '_userUpdated', data: res.data._user });

                    // Clear the _userToEdit state
                    clearUserToEdit();
                })
                .catch((error) => {
                    setModalHeader('We\'re sorry !');
                    setModalBody(JSON.stringify(error));
                    setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                    setShowModal(true);
                });
        } catch (error) {
            setModalHeader('We\'re sorry !');
            setModalBody(JSON.stringify(error));
            setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
            setShowModal(true);
        }
    };

    const onError = (error) => {
        setModalHeader('We\'re sorry !');
        setModalBody('Please check the fields for valid information.');
        setModalIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
        setShowModal(true);
    };

    useEffect(() => {
        _getCountries();

        const handleBeforeUnload = () => {
            clearUserToEdit();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        const subscription = watchSettings((value, { name, type }) => { });

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [_getCountries, watchSettings, clearUserToEdit]);

    return (
        <div className='_pane _settings d-flex flex-column'>
            <SimpleBar style={{ maxHeight: '100%' }} forceVisible='y' autoHide={false}>
                <Card className='rounded-0'>
                    <Card.Body className='border border-0 rounded-0 no-shadow'>
                        <Form onSubmit={handleSubmitSettings(onSubmit, onError)} className='grid' autoComplete='off'>
                            {/* Header */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'>
                                    <span>
                                        Account Settings.
                                        <p className='text-muted'>Update your Profile photo and details Here.</p>
                                    </span>
                                </Col>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3 ms-auto d-flex justify-content-end'>
                                    {
                                        //Upon click it just disapears or appears too fast
                                        !_.isEmpty(_userToEdit) && (
                                            <Button
                                                type='button'
                                                className='border border-0 rounded-0 _red'
                                                variant='link'
                                                onClick={() => _handleCancel('_first')}
                                            >
                                                Cancel<b className='pink_dot'>.</b>
                                            </Button>
                                        )
                                    }
                                    <Button
                                        type={`${_.isEmpty(_userToEdit) ? 'button' : 'submit'}`}
                                        className={`border border-0 rounded-0 inverse ${_.isEmpty(_userToEdit) ? '' : '_edit'}`}
                                        variant='outline-light'
                                        onClick={(ev) => {
                                            if (_.isEmpty(_userToEdit)) {
                                                ev.preventDefault();
                                                _handleEdit();
                                            }
                                        }}
                                    >
                                        <div className='buttonBorders'>
                                            <div className='borderTop'></div>
                                            <div className='borderRight'></div>
                                            <div className='borderBottom'></div>
                                            <div className='borderLeft'></div>
                                        </div>
                                        <span>
                                            {_.isEmpty(_userToEdit) ? 'Edit.' : 'Save Changes.'}
                                            <FontAwesomeIcon icon={faPen} />
                                        </span>
                                    </Button>
                                </Col>
                            </Row>

                            {/* Public information */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'>
                                    <span>
                                        Public information.
                                        <p className='text-muted'>This will be displayed on your profile.</p>
                                    </span>
                                </Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_lastname'
                                        className={`_formGroup ${_userLastnameFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Last Name.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_lastname')}
                                                onBlur={() => {
                                                    setUserlastnameFocused(false);
                                                    triggerSettings('_user_lastname');
                                                }}
                                                onFocus={() => setUserlastnameFocused(true)}
                                                placeholder='Lastname.'
                                                autoComplete='new-password'
                                                type='text'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_lastname ? 'border-danger' : ''}`}
                                                name='_user_lastname'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_lastname && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_lastname')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_lastname.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_lastname')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_lastname') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_firstname'
                                        className={`_formGroup ${_userFirstnameFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='First Name.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_firstname')}
                                                onBlur={() => {
                                                    setUserfirstnameFocused(false);
                                                    triggerSettings('_user_firstname');
                                                }}
                                                onFocus={() => setUserfirstnameFocused(true)}
                                                placeholder='Firstname.'
                                                autoComplete='new-password'
                                                type='text'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_firstname ? 'border-danger' : ''}`}
                                                name='_user_firstname'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_firstname && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_firstname')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_firstname.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_firstname')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                    className='__close'
                                                    onClick={() => { resetFieldSettings('_user_firstname') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_email'
                                        className={`_formGroup ${_userEmailFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Email.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_email')}
                                                onBlur={() => {
                                                    setUseremailFocused(false);
                                                    triggerSettings('_user_email');
                                                }}
                                                onFocus={() => setUseremailFocused(true)}
                                                placeholder='Email.'
                                                autoComplete='new-password'
                                                type='text'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_email ? 'border-danger' : ''}`}
                                                name='_user_email'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_email && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_email')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_email.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_email')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_email') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_username'
                                        className={`_formGroup ${_userUsernameFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Username.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_username')}
                                                onBlur={() => {
                                                    setUserusernameFocused(false);
                                                    triggerSettings('_user_username');
                                                }}
                                                onFocus={() => setUserusernameFocused(true)}
                                                placeholder='Username.'
                                                autoComplete='new-password'
                                                type='text'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_username ? 'border-danger' : ''}`}
                                                name='_user_username'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_username && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_username')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_username.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_username')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_username') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Profile photo */}
                            {/* Preview the image upon selecting it */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'>
                                    <span>
                                        Profile photo.
                                        <p className='text-muted'>Update your profile photo.</p>
                                    </span>
                                </Col>
                                <Col className='g-col-3'>
                                    {/* Replace all one option terniary conditions with the && */}
                                    <span className={`d-flex align-items-center justify-content-center ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}>
                                        <img src={_.isEmpty(_user._user_picture) ? 'logo' : _user._user_picture} alt='' />
                                        <Form.Group
                                            controlId='_user_picture'
                                            className={`_formGroup ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                        >
                                            <FloatingLabel
                                                className='_formLabel'
                                            >
                                                <Form.Control
                                                    {...registerSettings('_user_picture')}
                                                    type='file'
                                                    className='_formFile'
                                                    name='_user_picture'
                                                    disabled={_.isEmpty(_userToEdit)}
                                                />
                                            </FloatingLabel>
                                        </Form.Group>
                                    </span>
                                    {!_.isEmpty(_userToEdit) && (<span className='_editing d-flex justify-content-center align-items-center'><FontAwesomeIcon icon={faCamera} /></span>)}
                                </Col>
                            </Row>

                            {/* Contact information */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'>
                                    <span>
                                        Contact information.
                                        <p className='text-muted'>Update your profile photo.</p>
                                    </span>
                                </Col>
                                <Col className='g-col-3'>
                                    <Controller
                                        name='_user_country._country'
                                        control={controlSettings}
                                        render={({ field }) => (
                                            <Form.Group
                                                controlId='_user_country'
                                                className={`_formGroup ${_userCountryFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                            >
                                                <FloatingLabel
                                                    label='Country.'
                                                    className='_formLabel _autocomplete'
                                                    {...getLabelPropsCountry()}
                                                >
                                                    <Form.Control
                                                        {...getInputPropsCountry({
                                                            ...field,
                                                            onFocus: _handleFocusCountry,
                                                            onBlur: _handleBlurCountry
                                                        })}
                                                        placeholder='Country.'
                                                        className={`_formControl border rounded-0 ${errorsSettings._user_country ? 'border-danger' : ''} ${!_.isEmpty(_typedCharactersCountry) ? '_typing' : ''}`}
                                                        disabled={_.isEmpty(_userToEdit)}
                                                    />
                                                    <span className='d-flex align-items-center _autocorrect'>
                                                        {
                                                            (() => {
                                                                const __countrySuggestionSplit = _.split(_countrySuggestion, '');
                                                                const __typedCharactersCountrySplit = _.split(_typedCharactersCountry, '');
                                                                const __startIndex = _.indexOf(__countrySuggestionSplit, _.head(__typedCharactersCountrySplit));

                                                                return (
                                                                    <>
                                                                        {__startIndex !== -1 && (
                                                                            <>
                                                                                <p className='_countrySuggestion'>
                                                                                    {_.join(_.slice(__countrySuggestionSplit, 0, __startIndex), '')}
                                                                                </p>
                                                                            </>
                                                                        )}
                                                                        <p className='_typedCharacters'>
                                                                            {_typedCharactersCountry}
                                                                        </p>
                                                                        {__startIndex !== -1 && (
                                                                            <>
                                                                                <p className='_countrySuggestion'>
                                                                                    {_.join(_.slice(__countrySuggestionSplit, __startIndex + _.size(__typedCharactersCountrySplit)), '')}
                                                                                </p>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()
                                                        }
                                                    </span>
                                                    {
                                                        errorsSettings._user_country && (
                                                            <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(_userToEdit) && (!_.isEmpty(_typedCharactersCountry) || !_.isEqual(field.value, { _code: '', _country: '' })) ? '_fieldNotEmpty' : ''}`}>
                                                                {errorsSettings._user_country.message}
                                                            </Form.Text>
                                                        )
                                                    }
                                                    {
                                                        !_.isEmpty(_userToEdit) && (!_.isEmpty(_typedCharactersCountry) || !_.isEmpty(watchSettings('_user_country._country')))
                                                            ?
                                                            <div className='__close'
                                                                onClick={() => {
                                                                    setValueSettings('_user_country', { _code: '', _country: '' });
                                                                    _handleChangeCountry('');
                                                                }}
                                                            >
                                                            </div>
                                                            :
                                                            null
                                                    }
                                                </FloatingLabel>
                                                <SimpleBar className='_SimpleBar' style={{ maxHeight: '40vh' }} forceVisible='y' autoHide={false}>
                                                    <ListGroup
                                                        className={`border border-0 rounded-0 d-block ${!(isOpenCountry && __countryItems.length) && 'hidden'}`}
                                                        {...getMenuPropsCountry()}
                                                    >
                                                        {
                                                            isOpenCountry &&
                                                            _.map(
                                                                __countryItems
                                                                , (item, index) => {
                                                                    return (
                                                                        <ListGroup.Item
                                                                            className={`border border-0 rounded-0 d-flex align-items-center ${highlightedIndexCountry === index && 'bg-blue-300'} ${selectedItemCountry === item && 'font-bold'}`}
                                                                            key={`${item.value}${index}`}
                                                                            {...getItemPropsCountry({ item, index })}
                                                                        >
                                                                            <span>
                                                                                <img src={item._flag} alt={item._country} />
                                                                            </span>
                                                                            <span>
                                                                                {item._country}
                                                                            </span>
                                                                        </ListGroup.Item>
                                                                    )
                                                                }
                                                            )
                                                        }
                                                    </ListGroup>
                                                </SimpleBar>
                                            </Form.Group>
                                        )}
                                    />
                                </Col>
                                <Col className='g-col-3'>
                                    <Controller
                                        name='_user_city'
                                        control={controlSettings}
                                        render={({ field }) => (
                                            <Form.Group
                                                controlId='_user_city'
                                                className={`_formGroup ${_userCityFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                            >
                                                <FloatingLabel
                                                    label='City.'
                                                    className='_formLabel _autocomplete'
                                                    {...getLabelPropsCity()}
                                                >
                                                    <Form.Control
                                                        {...getInputPropsCity({
                                                            ...field,
                                                            onFocus: _handleFocusCity,
                                                            onBlur: _handleBlurCity
                                                        })}
                                                        placeholder='City.'
                                                        className={`_formControl border rounded-0 ${errorsSettings._user_city ? 'border-danger' : ''} ${!_.isEmpty(_typedCharactersCity) ? '_typing' : ''}`}
                                                        disabled={_.isEmpty(_userToEdit) || _.isEmpty(watchSettings('_user_country._country'))}
                                                    />
                                                    <span className='d-flex align-items-center _autocorrect'>
                                                        {
                                                            (() => {
                                                                const __citySuggestionSplit = _.split(_citySuggestion, '');
                                                                const __typedCharactersCitySplit = _.split(_typedCharactersCity, '');
                                                                const __startIndex = _.indexOf(__citySuggestionSplit, _.head(__typedCharactersCitySplit));

                                                                return (
                                                                    <>
                                                                        {__startIndex !== -1 && (
                                                                            <>
                                                                                <p className='_citySuggestion'>
                                                                                    {_.join(_.slice(__citySuggestionSplit, 0, __startIndex), '')}
                                                                                </p>
                                                                            </>
                                                                        )}
                                                                        <p className='_typedCharacters'>
                                                                            {_typedCharactersCity}
                                                                        </p>
                                                                        {__startIndex !== -1 && (
                                                                            <>
                                                                                <p className='_citySuggestion'>
                                                                                    {_.join(_.slice(__citySuggestionSplit, __startIndex + _.size(__typedCharactersCitySplit)), '')}
                                                                                </p>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()
                                                        }
                                                    </span>
                                                    {
                                                        errorsSettings._user_city && (
                                                            <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(_userToEdit) && (!_.isEmpty(_typedCharactersCity) || !_.isEqual(field.value, { _code: '', _city: '' })) ? '_fieldNotEmpty' : ''}`}>
                                                                {errorsSettings._user_city.message}
                                                            </Form.Text>
                                                        )
                                                    }
                                                    {
                                                        !_.isEmpty(_userToEdit) && (!_.isEmpty(_typedCharactersCity) || !_.isEmpty(watchSettings('_user_city')))
                                                            ?
                                                            <div className='__close'
                                                                onClick={() => {
                                                                    setValueSettings('_user_city', '');
                                                                    _handleChangeCity('');
                                                                }}
                                                            ></div>
                                                            :
                                                            null
                                                    }
                                                </FloatingLabel>
                                                <SimpleBar className='_SimpleBar' style={{ maxHeight: '40vh' }} forceVisible='y' autoHide={false}>
                                                    <ListGroup
                                                        className={`border border-0 rounded-0 d-block ${!(isOpenCity && __cityItems.length) && 'hidden'}`}
                                                        {...getMenuPropsCity()}
                                                    >
                                                        {
                                                            isOpenCity &&
                                                            _.map(
                                                                __cityItems
                                                                , (item, index) => {
                                                                    return (
                                                                        <ListGroup.Item
                                                                            className={`border border-0 rounded-0 d-flex align-items-center ${highlightedIndexCity === index && 'bg-blue-300'} ${selectedItemCity === item && 'font-bold'}`}
                                                                            key={`${item.value}${index}`}
                                                                            {...getItemPropsCity({ item, index })}
                                                                        >
                                                                            <span>
                                                                                {item._city}
                                                                            </span>
                                                                        </ListGroup.Item>
                                                                    )
                                                                }
                                                            )
                                                        }
                                                    </ListGroup>
                                                </SimpleBar>
                                            </Form.Group>
                                        )}
                                    />
                                </Col>
                            </Row>
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_phone'
                                        className={`_formGroup ${_userPhoneFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Phone.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_phone')}
                                                onBlur={() => {
                                                    setUserphoneFocused(false);
                                                    triggerSettings('_user_phone');
                                                }}
                                                onFocus={() => setUserphoneFocused(true)}
                                                placeholder='Phone.'
                                                autoComplete='new-password'
                                                type='text'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_phone ? 'border-danger' : ''}`}
                                                name='_user_phone'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_phone && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_phone')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_phone.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_phone')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_phone') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Security */}
                            {/* Resetting password if forgotten, but the motherfucker is already logged in, so WTF */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'>
                                    <span>
                                        Security.
                                        <p className='text-muted'>Update your password.</p>
                                    </span>
                                </Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_password'
                                        className={`_formGroup ${_userPasswordFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Password.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_password')}
                                                onBlur={() => {
                                                    setUserpasswordFocused(false);
                                                    triggerSettings('_user_password');
                                                }}
                                                onFocus={() => setUserpasswordFocused(true)}
                                                placeholder='Password.'
                                                autoComplete='new-password'
                                                type='password'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_password ? 'border-danger' : ''}`}
                                                name='_user_password'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_password && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_password')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_password.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_password')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_password') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_passwordNew'
                                        className={`_formGroup ${_userPasswordNewFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='New Password.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_passwordNew')}
                                                onBlur={() => {
                                                    setUserpasswordNewFocused(false);
                                                    triggerSettings('_user_passwordNew');
                                                }}
                                                onFocus={() => setUserpasswordNewFocused(true)}
                                                placeholder='New Password.'
                                                autoComplete='new-password'
                                                type='password'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_passwordNew ? 'border-danger' : ''}`}
                                                name='_user_passwordNew'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_passwordNew && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_lastname')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_passwordNew.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_passwordNew')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_passwordNew') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                                <Col className='g-col-3'>
                                    <Form.Group
                                        controlId='_user_passwordNewConfirm'
                                        className={`_formGroup ${_userPasswordNewConfirmFocused ? 'focused' : ''} ${_.isEmpty(_userToEdit) ? '_disabled' : ''}`}
                                    >
                                        <FloatingLabel
                                            label='Confirm Password.'
                                            className='_formLabel'
                                        >
                                            <Form.Control
                                                {...registerSettings('_user_passwordNewConfirm')}
                                                onBlur={() => {
                                                    setUserpasswordNewConfirmFocused(false);
                                                    triggerSettings('_user_passwordNewConfirm');
                                                }}
                                                onFocus={() => setUserpasswordNewConfirmFocused(true)}
                                                placeholder='Confirm Password.'
                                                autoComplete='new-password'
                                                type='password'
                                                className={`_formControl border rounded-0 ${errorsSettings._user_passwordNewConfirm ? 'border-danger' : ''}`}
                                                name='_user_passwordNewConfirm'
                                                disabled={_.isEmpty(_userToEdit)}
                                            />
                                            {
                                                errorsSettings._user_passwordNewConfirm && (
                                                    <Form.Text className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchSettings('_user_passwordNewConfirm')) ? '_fieldNotEmpty' : ''}`}>
                                                        {errorsSettings._user_passwordNewConfirm.message}
                                                    </Form.Text>
                                                )
                                            }
                                            {
                                                (!_.isEmpty(watchSettings('_user_passwordNewConfirm')) && !_.isEmpty(_userToEdit)) && (
                                                    <div
                                                        className='__close'
                                                        onClick={() => { resetFieldSettings('_user_passwordNewConfirm') }}
                                                    >
                                                    </div>
                                                )
                                            }
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Footer */}
                            <Row className='g-col-12 grid'>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3'></Col>
                                <Col className='g-col-3 ms-auto d-flex justify-content-end'>
                                    {
                                        //Upon click it just disapears or appears too fast
                                        !_.isEmpty(_userToEdit) && (
                                            <Button
                                                type='button'
                                                className='border border-0 rounded-0 _red'
                                                variant='link'
                                                onClick={() => _handleCancel('_first')}
                                            >
                                                Cancel<b className='pink_dot'>.</b>
                                            </Button>
                                        )
                                    }
                                    <Button
                                        type={`${_.isEmpty(_userToEdit) ? 'button' : 'submit'}`}
                                        className={`border border-0 rounded-0 inverse ${_.isEmpty(_userToEdit) ? '' : '_edit'}`}
                                        variant='outline-light'
                                        onClick={(ev) => {
                                            if (_.isEmpty(_userToEdit)) {
                                                ev.preventDefault();
                                                _handleEdit();
                                            }
                                        }}
                                    >
                                        <div className='buttonBorders'>
                                            <div className='borderTop'></div>
                                            <div className='borderRight'></div>
                                            <div className='borderBottom'></div>
                                            <div className='borderLeft'></div>
                                        </div>
                                        <span>
                                            {_.isEmpty(_userToEdit) ? 'Edit.' : 'Save Changes.'}
                                            <FontAwesomeIcon icon={faPen} />
                                        </span>
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Card.Body>
                </Card>
            </SimpleBar>
        </div>
    );
}

export default PSettings;