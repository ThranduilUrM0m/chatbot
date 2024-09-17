import React, { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { useCombobox, useMultipleSelection } from "downshift";
import ListGroup from "react-bootstrap/ListGroup";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import BootstrapTable from "react-bootstrap-table-next";
import { Type } from "react-bootstrap-table2-editor";
import {
    faCircleCheck,
    faCircleNotch,
    faCircleXmark,
    faHouse,
    faMagnifyingGlass,
    faPen,
    faRectangleXmark,
    faSquareCheck,
    faUserGroup,
    faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";
import axios from "axios";
import _useStore from "../../../store";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import SimpleBar from "simplebar-react";

import "simplebar-react/dist/simplebar.min.css";
import { io } from "socket.io-client";

const _socketURL = _.isEqual(process.env.NODE_ENV, "production")
    ? window.location.hostname
    : "localhost:5000";
const _socket = io(_socketURL, { transports: ["websocket", "polling"] });

const usePersistentFingerprint = () => {
    const [_fingerprint, setFingerprint] = useState("");

    useEffect(() => {
        const generateFingerprint = async () => {
            // Check if the persistent identifier exists in storage (e.g., cookie or local storage)
            const persistentIdentifier = localStorage.getItem("persistentIdentifier");

            if (persistentIdentifier) {
                // Use the persistent identifier if available
                setFingerprint(persistentIdentifier);
            } else {
                // Fallback to generating a new fingerprint using FingerprintJS
                const fp = await FingerprintJS.load();
                const { visitorId } = await fp.get();
                setFingerprint(visitorId);

                // Store the persistent identifier for future visits
                localStorage.setItem("persistentIdentifier", visitorId);
            }
        };

        generateFingerprint();
    }, []);

    return _fingerprint;
};

const PUsers = (props) => {
    const _users = _useStore.useUserStore((state) => state._users);
    const setUsers = _useStore.useUserStore((state) => state["_users_SET_STATE"]);
    const updateUsers = _useStore.useUserStore(
        (state) => state["_users_UPDATE_STATE_ITEM"]
    );

    const _user = _useStore.useUserStore((state) => state._user);

    const _userToEdit = _useStore.useUserStore((state) => state._userToEdit);
    const setUserToEdit = _useStore.useUserStore(
        (state) => state["_userToEdit_SET_STATE"]
    );
    const clearUserToEdit = _useStore.useUserStore(
        (state) => state["_userToEdit_CLEAR_STATE"]
    );

    /* In this Component the _fingerprint variable is not needed at load, so it's working fine,
      but what if someday the user is using somethin to block it or it just doesn't work,
      i'll have to make sure the field can be empty at axios calls */
    const _fingerprint = usePersistentFingerprint();

    const [_showModalForm, setShowModalForm] = useState(false);
    const [_modalHeaderForm, setModalFormHeader] = useState("");
    const [_modalBodyForm, setModalFormBody] = useState("");
    const [_modalIconForm, setModalFormIcon] = useState("");

    const [_showModal, setShowModal] = useState(false);

    const _validationSchema = Yup
        .object()
        .shape({
            _searchInput: Yup.string()
                .default('')
        });

    const {
        watch,
        setFocus,
        setValue,
        trigger,
        control
    } = useForm({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: yupResolver(_validationSchema),
        defaultValues: {
            _searchInput: ''
        }
    });

    /* Focus State Variables */
    const [_searchFocused, setSearchFocused] = useState(false);

    /* Form.Control data */
    let _userItems = _.orderBy(
        _.uniqBy(
            _.filter(
                _.map(
                    _.union(
                        _.flattenDeep(
                            _.map(
                                _users,
                                (_u) => [
                                    _u._user_username,
                                    _u._user_firstname,
                                    _u._user_lastname,
                                    _u._user_email,
                                    _u._user_city,
                                    _u._user_country?._country, // Use optional chaining here
                                    ..._.map(_u.Role, '_role_title') // Extract _role_title from each role object
                                ]
                            )
                        )
                    ),
                    (__userInfo) => {
                        // Ensure that userInfo is a string and handle undefined/null values
                        const combinedValue = _.compact(__userInfo).join(''); // Join into a single string, trim leading/trailing spaces, and convert to lowercase
                        return combinedValue ? { value: combinedValue.replace(/\.$/, '') } : null; // Exclude empty values
                    }
                ),
                (item) => item !== null // Filter out null values
            ),
            'value'
        ),
        ['value'],
        ['asc']
    );

    /* Downshift _searchInput */
    const [_typedCharactersSearch, setTypedCharactersSearch] = useState('');
    const [_searchSuggestion, setSearchSuggestion] = useState('');
    const [__items, setItems] = useState(
        _.orderBy(
            _.uniqBy(
                _userItems,
                'value'
            ),
            ['value'],
            ['asc']
        )
    );
    const _handleSelect = (__selectedItem) => {
        if (__selectedItem) {
            /* calling setValue from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
            setValue('_searchInput', __selectedItem.value);
            _handleChange(__selectedItem.value);
        }
    }
    const _handleChange = (__inputValue) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _userItems,
                    (item) =>
                        !_.lowerCase(_.trim(__inputValue)) ||
                        _.includes(
                            _.lowerCase(item.value),
                            _.lowerCase(_.trim(__inputValue))
                        )
                ),
                'value'
            ),
            ['value'],
            ['asc']
        );

        setTypedCharactersSearch(__inputValue);
        setSearchSuggestion((!_.isEmpty(__inputValue) && firstSuggestions[0]) ? (firstSuggestions[0].value) : '');
        setItems(firstSuggestions);
    }
    const _handleBlur = () => {
        setSearchFocused(!_.isEmpty(watch('_searchInput')) ? true : false);
        trigger('_searchInput');
    }
    const _handleFocus = () => {
        setSearchFocused(true);
    }
    const {
        getLabelProps,
        getInputProps,
        getItemProps,
        getMenuProps,
        highlightedIndex,
        selectedItem,
        isOpen
    } = useCombobox({
        items: __items,
        onInputValueChange({ inputValue }) { _handleChange(inputValue) },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) => _handleSelect(__selectedItem),
        itemToString: item => (item ? item.value : ''),
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
    getInputProps({}, { suppressRefError: true });
    getMenuProps({}, { suppressRefError: true });
    /* Downshift _searchInput */

    /* Bootstrap Table For Users */
    const _columns = [
        {
            dataField: "_user_username",
            text: "Nom d'Administrateur",
            sort: true,
            formatter: (cell, row) => {
                return (
                    <span className="d-flex flex-column justify-content-center me-auto">
                        <p className="m-0">
                            {cell}
                            {_.isEqual(_user._user_email, row._user_email) ? " (Toi)" : null}
                        </p>
                    </span>
                );
            },
        },
        {
            dataField: "_user_fullname",
            text: "Nom Complet",
            sort: true,
            formatter: (cell, row) => {
                // Combine first name and last name with space handling
                const __fullName =
                    !_.isEmpty(row._user_lastname) && !_.isEmpty(row._user_firstname)
                        ? `${row._user_firstname} ${row._user_lastname}`
                        : row._user_firstname || row._user_lastname || ""; // Fallback if one of them is empty
                return (
                    <span className="d-flex flex-column justify-content-center me-auto">
                        <p className="m-0">{__fullName}</p>
                    </span>
                );
            },
        },
        {
            dataField: "_user_email",
            text: "Email",
            sort: true,
            formatter: (cell) => {
                return (
                    <span className="d-flex flex-column justify-content-center me-auto">
                        <p className="m-0">{cell}</p>
                    </span>
                );
            },
        },
        {
            dataField: "_user_adresse",
            text: "Adresse",
            sort: true,
            formatter: (cell, row) => {
                // Combine city and country with fallback logic
                const __location = !_.isEmpty(row._user_city)
                    ? `${row._user_city}, ${row._user_country?._country}`
                    : row._user_country?._country || ""; // Fallback to country if city is empty
                return (
                    <span className="d-flex flex-column justify-content-center me-auto">
                        <p className="m-0">{__location}</p>
                    </span>
                );
            },
        },
        {
            dataField: "Role",
            text: "Roles",
            sort: true,
            headerAlign: "center",
            headerFormatter: (column, colIndex) => {
                return <FontAwesomeIcon icon={faUserTie} />;
            },
            formatter: (cell, row) => {
                return (
                    <ul className="text-muted tags d-flex flex-row align-items-start">
                        {_.map(cell, (_role) => (
                            <li
                                key={`${_role._role_title}`}
                                className={`tag_item border rounded-0 d-flex align-items-center`}
                            >
                                <p>{_.upperFirst(_role._role_title)}.</p>
                            </li>
                        ))}
                    </ul>
                );
            },
            editable: false,
        },
        {
            dataField: "_user_isActive",
            text: "Status",
            sort: true,
            headerAlign: "center",
            editor: {
                type: Type.CHECKBOX,
                value: "True:False",
            },
            headerFormatter: (column, colIndex) => {
                return <FontAwesomeIcon icon={faCircleNotch} />;
            },
            formatter: (cell, row) => {
                return cell ? (
                    <Badge bg="success">
                        <FontAwesomeIcon icon={faCircleCheck} />
                        En ligne.
                    </Badge>
                ) : (
                    <Badge bg="danger">
                        <FontAwesomeIcon icon={faCircleXmark} />
                        Hors ligne.
                    </Badge>
                );
            },
            editable: false,
        },
        {
            dataField: "_user_isVerified",
            text: "",
            sort: true,
            editor: {
                type: Type.CHECKBOX,
                value: "True:False",
            },
            formatter: (cell) => {
                return cell ? (
                    <Badge bg="success">
                        <FontAwesomeIcon icon={faCircleCheck} />
                        Vérifié.
                    </Badge>
                ) : (
                    <Badge bg="danger">
                        <FontAwesomeIcon icon={faCircleXmark} />
                        Non Vérifié.
                    </Badge>
                );
            },
        },
        {
            dataField: "_user_toDelete",
            text: "",
            sort: true,
            editor: {
                type: Type.CHECKBOX,
                value: "True:False",
            },
            formatter: (cell) => {
                return cell ? (
                    <Badge bg="danger">
                        <FontAwesomeIcon icon={faCircleXmark} />
                        Pending Deletion.
                    </Badge>
                ) : null;
            },
        },
        {
            dataField: "_edit",
            text: "",
            isDummyField: true,
            style: {
                width: "15vh",
            },
            formatter: (cell, row) => {
                return _.some(_user.Role, { _role_title: "Fondateur" }) ||
                    _.isEqual(_user._user_email, row._user_email) ? (
                    <Form>
                        <Button
                            type="button"
                            className="border border-0 rounded-0 inverse"
                            variant="outline-light"
                            onClick={() => {
                                _handleEdit(row);
                                setShowModal(true);
                            }}
                        >
                            <div className="buttonBorders">
                                <div className="borderTop"></div>
                                <div className="borderRight"></div>
                                <div className="borderBottom"></div>
                                <div className="borderLeft"></div>
                            </div>
                            <span>Modifier.</span>
                        </Button>
                    </Form>
                ) : null;
            },
        },
        {
            dataField: "_delete",
            text: "",
            isDummyField: true,
            style: {
                width: "15vh",
            },
            formatter: (cell, row) => {
                return _.some(_user.Role, { _role_title: "Fondateur" }) &&
                    !_.isEqual(_user._user_email, row._user_email) ? (
                    <Form>
                        <Button
                            type="button"
                            className="border border-0 rounded-0 _danger"
                            variant="outline-light"
                            onClick={() => {
                                setUserToEdit(row);
                                setModalFormHeader("Confirmer la suppression");
                                setModalFormBody(
                                    `Êtes-vous sûr de vouloir supprimer ${row._user_username} ?\nVotre compte sera bien signalé pour être supprimer et un email sera envoyé à votre adresse email pour vous notifier de ce fait.`
                                );
                                setModalFormIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                                setShowModalForm(true);
                            }}
                        >
                            <div className="buttonBorders">
                                <div className="borderTop"></div>
                                <div className="borderRight"></div>
                                <div className="borderBottom"></div>
                                <div className="borderLeft"></div>
                            </div>
                            <span>Supprimer.</span>
                        </Button>
                    </Form>
                ) : null;
            },
        },
    ];
    /* Bootstrap Table For Users */

    const _validationSchemaUser = Yup.object()
        .shape({
            _user_email: Yup.string()
                .default("")
                .required("Veuillez fournir une adresse email valid !")
                .test(
                    "empty-or-valid-email",
                    "Veuillez fournir une adresse email valid !",
                    (__email) =>
                        !__email ||
                        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(__email)
                ),
            _user_username: Yup.string()
                .default("")
                .required("Veuillez fournir un username !")
                .test(
                    "empty-or-valid-username",
                    "Doit contenir entre 3 et 20 caractère.",
                    (__username) => !__username || /^[a-zA-Z0-9_]{3,20}$/.test(__username)
                ),
            _user_password: Yup.string()
                .default("")
                .when("$userToEdit", {
                    is: (userToEdit) => !_.isNil(userToEdit) && !_.isEmpty(userToEdit), // Only validate when updating an existing user
                    then: (schema) =>
                        schema
                            .notRequired()
                            .test(
                                "password-required-for-update",
                                "Si vous souhaitez modifier le mot de passe, fournissez le mot de passe actuel.",
                                function (value) {
                                    const { _user_passwordNew, _user_passwordNewConfirm } =
                                        this.parent;
                                    // If user has filled any of the new password fields, the current password is required
                                    return (
                                        (!value &&
                                            !_user_passwordNew &&
                                            !_user_passwordNewConfirm) ||
                                        (!!value &&
                                            !!_user_passwordNew &&
                                            !!_user_passwordNewConfirm)
                                    );
                                }
                            ),
                    otherwise: (schema) => schema.notRequired(), // Not required when adding a new user
                }),
            _user_passwordNew: Yup.string()
                .when("$userToEdit", {
                    is: (userToEdit) => _.isEmpty(userToEdit), // For adding a new user
                    /* Modifier */
                    then: (schema) =>
                        schema
                            // Ensure required validation happens before regex validation
                            .required("Le nouveau mot de passe est requis.")
                            .nullable() // Allows null or empty value before regex runs
                            .matches(
                                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/,
                                "Majuscule, minuscule, chiffre et symbole requis."
                            ),
                    /* Ajouter */
                    otherwise: (schema) =>
                        schema
                            .test(
                                "password-new-validation",
                                "Si vous souhaitez modifier le mot de passe, fournissez un nouveau mot de passe valide.",
                                function (value) {
                                    const { _user_password, _user_passwordNewConfirm } = this.parent;

                                    // If the current password is filled, the new password should be required
                                    if (_user_password) {
                                        return !!value && !!_user_passwordNewConfirm;
                                    }

                                    // Otherwise, allow it to be empty if no new password is provided
                                    return !value || (!!value && !!_user_passwordNewConfirm);
                                }
                            )
                            .matches(
                                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[a-zA-Z\d!@#$%^&*()]{8,}$/,
                                "Majuscule, minuscule, chiffre et symbole requis."
                            )
                            .notRequired(), // New password is not required unless the current one is filled
                }),
            _user_passwordNewConfirm: Yup.string()
                .default("")
                .when(["$userToEdit", "_user_passwordNew"], {
                    is: (userToEdit, newPassword) => !_.isEmpty(newPassword) || _.isNil(userToEdit), // Validate confirm only when new password is provided
                    then: (schema) =>
                        schema
                            .required("Veuillez confirmer le nouveau mot de passe.")
                            .oneOf(
                                [Yup.ref("_user_passwordNew")],
                                "Les mots de passe doivent correspondre."
                            ),
                    otherwise: (schema) => schema.notRequired(),
                }),
            _user_picture: Yup.string().default(""),
            _user_firstname: Yup.string()
                .default("")
                .test(
                    "empty-or-valid-firstname",
                    "Pas de chiffres ni de symboles.",
                    (__firstname) => !__firstname || /^[a-zA-Z\s]{2,}$/i.test(__firstname)
                ),
            _user_lastname: Yup.string()
                .default("")
                .test(
                    "empty-or-valid-lastname",
                    "Pas de chiffres ni de symboles.",
                    (__lastname) => !__lastname || /^[a-zA-Z\s]{2,}$/i.test(__lastname)
                ),
            _user_city: Yup.string().default(""),
            _user_country: Yup.object().shape({
                _code: Yup.string().default(""),
                _country: Yup.string().default(""),
            }),
            user_phone: Yup.string()
                .default("")
                .test(
                    "empty-or-valid-phone",
                    "Veuillez fournir une adresse email valid !",
                    (__phone) =>
                        !__phone ||
                        /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/.test(
                            __phone
                        )
                ),
            _user_toDelete: Yup.boolean().default(false),
            Role: Yup.array().default([]),
        })
        .test(
            "passwords-match",
            "Les mots de passe doivent correspondre.",
            (values) => {
                if (values._user_passwordNew || values._user_passwordNewConfirm) {
                    if (values._user_passwordNew !== values._user_passwordNewConfirm) {
                        return false; // Trigger the 'passwords-match' error
                    }
                    if (values._user_passwordNew === values._user_password) {
                        return false; // Trigger the 'not-same-as-current-password' error
                    }
                }
                return true; // All checks passed
            }
        )
        .required();
    const {
        register: registerUser,
        control: controlUser,
        handleSubmit: handleSubmitUser,
        watch: watchUser,
        setValue: setValueUser,
        reset: resetUser,
        resetField: resetFieldUser,
        setError: setErrorUser,
        formState: { errors: errorsUser },
    } = useForm({
        mode: "onBlur",
        reValidateMode: "onChange",
        resolver: yupResolver(_validationSchemaUser),
        context: { userToEdit: _userToEdit },
        defaultValues: {
            _user_email: "",
            _user_username: "",
            _user_password: "",
            _user_passwordNew: "",
            _user_passwordNewConfirm: "",
            _user_picture: "",
            _user_firstname: "",
            _user_lastname: "",
            _user_city: "",
            _user_country: { _code: "", _country: "" },
            _user_phone: "",
            _user_toDelete: false,
            Role: [],
        },
    });

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
    const [RoleFocused, setRoleFocused] = useState(false);

    /* Countries and Cities State Variables */
    const [_countries, setCountries] = useState([]);
    const [_cities, setCities] = useState([]);

    /* Downshift _user_country */
    const [_typedCharactersCountry, setTypedCharactersCountry] = useState("");
    const [_countrySuggestion, setCountrySuggestion] = useState("");
    const [__countryItems, setCountryItems] = useState([]);
    const _handleSelectCountry = (__selectedItem) => {
        if (__selectedItem) {
            /* calling setValueUser from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
            setValueUser("_user_country", {
                _code: __selectedItem._code,
                _country: __selectedItem._country,
            });
            _handleChangeCountry(__selectedItem._country);
        }
    };
    const _handleChangeCountry = (__inputValue) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _countries,
                    (item) =>
                        !__inputValue ||
                        _.includes(_.lowerCase(item._country), _.lowerCase(__inputValue))
                ),
                "_country"
            ),
            ["_country"],
            ["asc"]
        );

        setTypedCharactersCountry(__inputValue);
        setCountrySuggestion(
            !_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)
                ? firstSuggestions[0]._country
                : ""
        );
        setCountryItems(firstSuggestions);
        _getCities(
            !_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)
                ? firstSuggestions[0]._code
                : ""
        );
        if (
            !_.isEqual(
                _userToEdit?._user_country?._country,
                firstSuggestions[0]?._country
            )
        ) {
            // If the suggestion picked is not the same as the _user's country
            setValueUser("_user_city", "");
            _handleChangeCity("");
        }
    };
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
                "_country"
            ),
            ["_country"],
            ["asc"]
        );

        if (!_.isEmpty(__event.target.value)) {
            // If the user left the Form not empty
            if (!_.isEmpty(firstSuggestions)) {
                // If there is a valid suggestion
                setValueUser("_user_country", {
                    _code: firstSuggestions[0]._code,
                    _country: firstSuggestions[0]._country,
                });
                _getCities(firstSuggestions[0]._code);
            } else {
                // If there is a no valid suggestion
                setErrorUser("_user_country", {
                    type: "manual",
                    message: "Not a valid Country.",
                });
                _getCities("");
            }
        } else {
            // If the user left the Form empty
            setValueUser("_user_country", { _code: "", _country: "" });
            _getCities("");
        }

        setTypedCharactersCountry("");
        setCountrySuggestion("");
        setCountryItems(__countryItems);
        if (
            !_.isEqual(
                _userToEdit?._user_country?._country,
                firstSuggestions[0]?._country
            )
        ) {
            // If the suggestion picked is not the same as the _user's country
            setValueUser("_user_city", "");
            _handleChangeCity("");
        }
        setUsercountryFocused(
            !_.isEmpty(watchUser("_user_country._country")) ? true : false
        );
    };
    const _handleFocusCountry = () => {
        setUsercountryFocused(true);
    };
    const {
        getLabelProps: getLabelPropsCountry,
        getInputProps: getInputPropsCountry,
        getItemProps: getItemPropsCountry,
        getMenuProps: getMenuPropsCountry,
        highlightedIndex: highlightedIndexCountry,
        selectedItem: selectedItemCountry,
        isOpen: isOpenCountry,
    } = useCombobox({
        items: __countryItems,
        onInputValueChange({ inputValue }) {
            _handleChangeCountry(inputValue);
        },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) =>
            _handleSelectCountry(__selectedItem),
        itemToString: (item) => (item ? item._country : ""),
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
        },
    });
    getInputPropsCountry({}, { suppressRefError: true });
    getMenuPropsCountry({}, { suppressRefError: true });
    /* Downshift _user_country */

    /* Downshift _user_city */
    const [_typedCharactersCity, setTypedCharactersCity] = useState("");
    const [_citySuggestion, setCitySuggestion] = useState("");
    const [__cityItems, setCityItems] = useState([]);
    const _handleSelectCity = (__selectedItem) => {
        if (__selectedItem) {
            /* calling setValueUser from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
            setValueUser("_user_city", __selectedItem._city);
            _handleChangeCity(__selectedItem._city);
        }
    };
    const _handleChangeCity = (__inputValue) => {
        const firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _cities,
                    (item) =>
                        !__inputValue ||
                        _.includes(_.lowerCase(item._city), _.lowerCase(__inputValue))
                ),
                "_city"
            ),
            ["_city"],
            ["asc"]
        );

        setTypedCharactersCity(__inputValue);
        setCitySuggestion(
            !_.isEmpty(__inputValue) && !_.isEmpty(firstSuggestions)
                ? firstSuggestions[0]._city
                : ""
        );
        setCityItems(firstSuggestions);
    };
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
                "_city"
            ),
            ["_city"],
            ["asc"]
        );

        if (!_.isEmpty(__event.target.value)) {
            // If the user left the Form not empty
            if (!_.isEmpty(firstSuggestions)) {
                // If there is a valid suggestion
                setValueUser("_user_city", firstSuggestions[0]._city);
            } else {
                // If there is a no valid suggestion
                setErrorUser("_user_city", {
                    type: "manual",
                    message: "Not a valid City.",
                });
            }
        } else {
            // If the user left the Form empty
            setValueUser("_user_city", "");
        }

        setTypedCharactersCity("");
        setCitySuggestion("");
        setCityItems(__cityItems);

        setUsercityFocused(!_.isEmpty(watchUser("_user_city")) ? true : false);
    };
    const _handleFocusCity = () => {
        setUsercityFocused(true);
    };
    const {
        getLabelProps: getLabelPropsCity,
        getInputProps: getInputPropsCity,
        getItemProps: getItemPropsCity,
        getMenuProps: getMenuPropsCity,
        highlightedIndex: highlightedIndexCity,
        selectedItem: selectedItemCity,
        isOpen: isOpenCity,
    } = useCombobox({
        items: __cityItems,
        onInputValueChange({ inputValue }) {
            _handleChangeCity(inputValue);
        },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) =>
            _handleSelectCity(__selectedItem),
        itemToString: (item) => (item ? item._city : ""),
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
        },
    });
    getInputPropsCity({}, { suppressRefError: true });
    getMenuPropsCity({}, { suppressRefError: true });
    /* Downshift _user_city */


    /*** Roles ***/
    /** Variables **/
    /* FormControl Temporary Error variable */
    const [RoleError, setRoleError] = useState('');
    /* Roles state variable */
    const [__roles, setRoles] = useState([]);

    /* Downshift Role */
    const [_typedCharactersRole, setTypedCharactersRole] = useState('');
    const [_roleSuggestion, setRoleSuggestion] = useState('');
    const [__roleItems, setItemsRole] = useState([]);

    const {
        selectedItems: selectedItemsRoles,
        addSelectedItem: addSelectedItemRole,
        removeSelectedItem: removeSelectedItemRole,
        getDropdownProps: getDropdownPropsRole,
        getSelectedItemProps,
    } = useMultipleSelection({
        initialSelectedItems: _.map(watchUser('Role'), value => ({ value })),
        onStateChange: ({ selectedItems }) => {
            setValueUser(
                'Role',
                _.map(selectedItems, (item) => item.value));
        },
    });

    const _handleSelectRole = (__selectedItem) => {
        if (selectedItemsRoles.length >= 10) {
            setRoleError('Limit reached, maximum of 10 roles allowed');
            return; // Block further selection if the limit is reached
        }

        if (
            __selectedItem &&
            !_.some(selectedItemsRoles, { _role_title: __selectedItem._role_title })
        ) {
            addSelectedItemRole(__selectedItem);
            setRoleError('');
        } else {
            setRoleError('This role has already been selected');
        }
    };
    const _handleRemoveRole = (__index) => {
        const __selectedItem = selectedItemsRoles[__index];
        if (__selectedItem) {
            removeSelectedItemRole(__selectedItem);
            setItemsRole((prevItems) => [...prevItems, __selectedItem]);
        }
        setRoleError('');
    };
    const _handleChangeRole = (__inputValue) => {
        console.log('Handle Change Role:', __inputValue);
        /* If it includes it, it could mean that the suggestion is 'world' and the typped value is only 'orl' */
        let firstSuggestions = _.orderBy(
            _.uniqBy(
                _.filter(
                    _.filter(
                        __roles,
                        (item) =>
                            !__inputValue ||
                            _.includes(_.lowerCase(item._role_title), _.lowerCase(__inputValue))
                    ),
                    (item) => !selectedItemsRoles.some((selected) => selected._role_title === item._role_title) // Exclude already selected roles
                ),
                '_role_title'
            ),
            ['_role_title'],
            ['asc']
        );

        /* The degree of similarity between the suggestion and input */
        let __similarity =
            _.intersection(
                _.split(
                    _.toLower(
                        !_.isEmpty(__inputValue) && firstSuggestions[0]
                            ? firstSuggestions[0].value
                            : ''
                    ),
                    ''
                ),
                _.split(_.toLower(_.trim(__inputValue)), '')
            ).length /
            _.max([
                _.size(
                    !_.isEmpty(__inputValue) && firstSuggestions[0]
                        ? firstSuggestions[0].value
                        : ''
                ),
                _.size(_.toLower(_.trim(__inputValue))),
            ]);

        if (!__similarity && !_.isEmpty(__inputValue)) {
            axios(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${_.toLower(
                    _.trim(__inputValue)
                )}`
            )
                .then((response) => {
                    if (response.status === 200) {
                        setItemsRole([
                            ...firstSuggestions,
                            { value: _.toLower(__inputValue) },
                        ]);
                        setRoleError('');
                    }
                })
                .catch((error) => {
                    setRoleError('Please enter a valid role.');
                });
        } else {
            setItemsRole(firstSuggestions);
            setRoleError('');
        }

        setInputValueRole(__inputValue);
        setTypedCharactersRole(__inputValue);
        setRoleSuggestion(
            !_.isEmpty(__inputValue) && firstSuggestions[0]
                ? firstSuggestions[0]._role_title // Use _role_title for suggestions
                : ''
        );
        /* If the role is already selected then throw error and block selection for the suggestion */
    };
    const _handleBlurRole = async () => {
        setRoleFocused(!_.isEmpty(watchUser('Role')));
    };
    const _handleFocusRole = () => {
        setRoleFocused(true);
    };
    /* The isOpen should stay true after selecting, but it does not */
    const {
        inputValue: inputValueRole,
        setInputValue: setInputValueRole,
        getLabelProps: getLabelPropsRole,
        getInputProps: getInputPropsRole,
        getItemProps: getItemPropsRole,
        getMenuProps: getMenuPropsRole,
        highlightedIndex: highlightedIndexRole,
        selectedItem: selectedItemRole,
        isOpen: isOpenRole,
    } = useCombobox({
        items: __roleItems,
        selectedItem: null,
        onInputValueChange({ inputValue, isOpen }) {
            // Ensure this function is invoked
            console.log('onInputValueChange', inputValue, isOpen);
            if (!selectedItemRole && isOpen) {
                _handleChangeRole(inputValue);
            }
            setInputValueRole(inputValue || '');
        },
        onSelectedItemChange: ({ selectedItem: __selectedItem }) => {
            _handleSelectRole(__selectedItem);
            setInputValueRole('');  // Clear input after selecting
            setTypedCharactersRole('');  // Also clear the typed characters
        },
        itemToString: (item) => (item ? item._role_title : ''),
        stateReducer: (state, actionAndChanges) => {
            const { type, changes } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputChange:
                    return { ...changes, inputValue: state.inputValue };
                case useCombobox.stateChangeTypes.InputClick:
                    return { ...changes, isOpen: true, highlightedIndex: 0 };
                case useCombobox.stateChangeTypes.FunctionSelectItem:
                    return { ...changes, isOpen: true };
                default:
                    return changes;
            }
        }
    });
    getInputPropsRole({}, { suppressRefError: true });
    getMenuPropsRole({}, { suppressRefError: true });
    getDropdownPropsRole({}, { suppressRefError: true });
    /*** Roles ***/


    const _getCities = useCallback(
        async (countryCode) => {
            try {
                !_.isEmpty(countryCode) &&
                    axios(
                        `http://api.geonames.org/searchJSON?country=${countryCode}&username=thranduilurm0m`
                    )
                        .then((response) => {
                            const data = response.data;
                            const cityList = _.map(data.geonames, (city) => {
                                // Check if the feature code corresponds to a city (you may need to adjust this condition based on the API response)
                                if (
                                    city.fcode !== "RGN" &&
                                    city.fcode !== "PCLI" &&
                                    city.fcode !== "ADM1" &&
                                    city.fcode !== "ADM1H" &&
                                    city.fcode !== "AIRP"
                                ) {
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
                                        "_city"
                                    ),
                                    ["_city"],
                                    ["asc"]
                                )
                            );
                            setCityItems(
                                _.orderBy(
                                    _.uniqBy(
                                        _.filter(cityList, (city) => city !== null),
                                        "_city"
                                    ),
                                    ["_city"],
                                    ["asc"]
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

    const _getCountries = useCallback(async () => {
        try {
            axios("https://restcountries.com/v3.1/all")
                .then((response) => {
                    const data = response.data;
                    const countryList = _.map(data, (country) => ({
                        _country: country.name.common,
                        _code: country.cca2,
                        _flag: country.flags.svg,
                    }));
                    setCountries(
                        _.orderBy(_.uniqBy(countryList, "_country"), ["_country"], ["asc"])
                    );
                    setCountryItems(
                        _.orderBy(_.uniqBy(countryList, "_country"), ["_country"], ["asc"])
                    );

                    !_.isEmpty(watchUser("_user_country._country"))
                        ? _getCities(watchUser("_user_country._code"))
                        : _getCities(countryList[0]?._code);
                })
                .catch((error) => {
                    console.log(error);
                });
        } catch (error) {
            console.log(error);
        }
    }, [setCountries, watchUser, _getCities]);

    const _handleEdit = (_u) => {
        setValueUser("_user_email", _u._user_email);
        setValueUser("_user_username", _u._user_username);
        setValueUser("_user_picture", _u._user_picture);
        setValueUser("_user_firstname", _u._user_firstname);
        setValueUser("_user_lastname", _u._user_lastname);
        setValueUser("_user_city", _u._user_city);
        setValueUser("_user_country", _u._user_country);
        setValueUser("_user_phone", _u._user_phone);
        setValueUser("_user_toDelete", _u._user_toDelete);
        setValueUser("Role", _u.Role);

        // Set the article to be edited in the _articleToEdit state
        setUserToEdit(_u);
    };

    const _handleDelete = (_id) => {
        return axios.delete(`/api/user/${_id}`).then((res) => {
            _getUsers();
            _socket.emit("action", { type: "_userDeleted", data: res.data._user });
        });
    };

    const _handleCancel = () => {
        // Reset the form fields
        resetUser({
            _user_email: "",
            _user_username: "",
            _user_password: "",
            _user_passwordNew: "",
            _user_passwordNewConfirm: "",
            _user_picture: "",
            _user_firstname: "",
            _user_lastname: "",
            _user_city: "",
            _user_country: { _code: "", _country: "" },
            _user_phone: "",
            _user_toDelete: false,
            Role: [],
        });

        clearUserToEdit();
    };

    const _getUsers = useCallback(async () => {
        try {
            axios("/api/user")
                .then((response) => {
                    setUsers(response.data._users);
                })
                .catch((error) => {
                    console.log(error);
                });
        } catch (error) {
            console.log(error);
        }
    }, [setUsers]);

    const _getRoles = useCallback(async () => {
        try {
            axios("/api/role")
                .then((response) => {
                    setRoles(response.data._roles);
                    setItemsRole(response.data._roles);
                })
                .catch((error) => {
                    console.log(error);
                });
        } catch (error) {
            console.log(error);
        }
    }, [setRoles]);

    const onSubmit = async (values) => {
        const formData = new FormData();
        _.isEmpty(values._user_fingerprint) &&
            (values._user_fingerprint = _fingerprint);

        try {
            for (const [key, value] of Object.entries(values)) {
                if (!_.isEmpty(value)) {
                    if (key === "_user_country" || key === "Role") {  // Add "Role" or other array fields here
                        formData.append(key, JSON.stringify(value));  // Serialize the array to JSON
                    } else {
                        formData.append(key, value);
                    }
                }
            }

            if (_.isEmpty(_userToEdit)) {
                return axios
                    .post("/api/user", formData, {
                        headers: {
                            "Content-Type": "multipart/form-data", // Important: set the content type to 'multipart/form-data'
                        },
                    })
                    .then((response) => {
                        _getUsers();
                        _socket.emit("action", {
                            type: "_userCreated",
                            data: response.data._user,
                        });
                        setModalFormHeader("Hello ✔ and Welcome !");
                        setModalFormBody(
                            response.data._messageText
                        );
                        setModalFormIcon(<FontAwesomeIcon icon={faSquareCheck} />);
                        setShowModalForm(true);
                    })
                    .then(() => {
                        resetUser({
                            _user_email: "",
                            _user_username: "",
                            _user_password: "",
                            _user_passwordNew: "",
                            _user_passwordNewConfirm: "",
                            _user_picture: "",
                            _user_firstname: "",
                            _user_lastname: "",
                            _user_city: "",
                            _user_country: { _code: "", _country: "" },
                            _user_phone: "",
                            _user_toDelete: false,
                            Role: [],
                        });
                        _handleChangeRole("");

                        return axios
                            .post("/api/notification", {
                                _notification_title: `${_user._user_username} vient d'ajouter un Administrateur ${_fingerprint}.`,
                                _notification_user: formData
                            })
                            .catch((error) => {
                                console.log(error);
                            });
                    })
                    .catch((error) => {
                        setModalFormHeader("We're sorry !");
                        setModalFormBody(error.response.data.text);
                        setModalFormIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                        setShowModalForm(true);
                    });
            } else {
                return axios
                    .patch(`/api/user/${_userToEdit._id}`, formData, {
                        headers: {
                            "Content-Type": "multipart/form-data", // Important: set the content type to 'multipart/form-data'
                        },
                    })
                    .then((res) => {
                        updateUsers(res.data);
                        _getUsers();
                        _socket.emit("action", {
                            type: "_userUpdated",
                            data: res.data._user,
                        });
                        setModalFormHeader("All Done ✔ ");
                        setModalFormIcon(<FontAwesomeIcon icon={faSquareCheck} />);
                        setShowModalForm(true);
                    })
                    .then(() => {
                        resetUser({
                            _user_email: "",
                            _user_username: "",
                            _user_password: "",
                            _user_passwordNew: "",
                            _user_passwordNewConfirm: "",
                            _user_picture: "",
                            _user_firstname: "",
                            _user_lastname: "",
                            _user_city: "",
                            _user_country: { _code: "", _country: "" },
                            _user_phone: "",
                            _user_toDelete: false,
                            Role: [],
                        });
                        _handleChangeRole("");

                        clearUserToEdit();
                    })
                    .catch((error) => {
                        setModalFormHeader("We're sorry !");
                        setModalFormBody(error.response.data.text);
                        setModalFormIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
                        setShowModalForm(true);
                    });
            }
        } catch (error) {
            setModalFormHeader("We're sorry !");
            setModalFormBody(JSON.stringify(error));
            setModalFormIcon(<FontAwesomeIcon icon={faRectangleXmark} />);
            setShowModalForm(true);
        }
    };

    const onError = (error) => {
        console.log(error);
    };

    useEffect(() => {
        _getUsers();
        _getRoles();
        _getCountries();

        _socket.on('_userConfirmedLoad', (message) => {
            _getUsers();
        });

        const handleBeforeUnload = () => {
            clearUserToEdit();
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        const subscription = watchUser((value, { name, type }) => { });

        return () => {
            subscription.unsubscribe();
            window.removeEventListener("beforeunload", handleBeforeUnload);
            _socket.off('newConversation');
            _socket.off('messageSent');
        };
    }, [_getUsers, _getCountries, watchUser, clearUserToEdit]);

    return (
        <div className="_pane _users d-flex flex-column">
            <Card className="rounded-0 h-100">
                <Card.Body className="h-100 border border-0 rounded-0 no-shadow">
                    <div className="_header d-flex align-items-center">
                        <Breadcrumb className="d-flex">
                            <Breadcrumb.Item href="/">
                                <FontAwesomeIcon icon={faHouse} />
                                <span className="w-100 g-col-11">
                                    <p>
                                        Dashboard<b className="pink_dot">.</b>
                                    </p>
                                </span>
                            </Breadcrumb.Item>
                            <Breadcrumb.Item active>
                                <FontAwesomeIcon icon={faUserGroup} />
                                <span className="w-100 g-col-11">
                                    <p>
                                        Administrateurs<b className="pink_dot">.</b>
                                    </p>
                                </span>
                            </Breadcrumb.Item>
                        </Breadcrumb>

                        <div className="_search  ms-auto">
                            <Form onClick={() => setFocus('_searchInput')}>
                                <Controller
                                    name='_searchInput'
                                    control={control}
                                    render={({ field }) => (
                                        <Form.Group
                                            controlId='_searchInput'
                                            className={`_formGroup _searchGroup ${_searchFocused ? 'focused' : ''}`}
                                        >
                                            <FloatingLabel
                                                label='Search.'
                                                className='_formLabel _autocomplete'
                                                {...getLabelProps()}
                                            >
                                                <Form.Control
                                                    {...getInputProps({
                                                        ...field,
                                                        onFocus: _handleFocus,
                                                        onBlur: _handleBlur
                                                    })}
                                                    placeholder='Search.'
                                                    className={`_formControl rounded-0 ${!_.isEmpty(_typedCharactersSearch) ? '_typing' : ''}`}
                                                />
                                                <span className='d-flex align-items-center _autocorrect'>
                                                    {
                                                        (() => {
                                                            const __searchSuggestionSplit = _.split(_searchSuggestion, '');
                                                            const __typedCharactersSearchSplit = _.split(_typedCharactersSearch, '');
                                                            const __startIndex = _.indexOf(__searchSuggestionSplit, _.head(__typedCharactersSearchSplit));

                                                            return (
                                                                <>
                                                                    {__startIndex !== -1 && (
                                                                        <>
                                                                            <p className='_searchSuggestion'>
                                                                                {_.join(_.slice(__searchSuggestionSplit, 0, __startIndex), '')}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                    <p className='_typedCharacters'>
                                                                        {_typedCharactersSearch}
                                                                    </p>
                                                                    {__startIndex !== -1 && (
                                                                        <>
                                                                            <p className='_searchSuggestion'>
                                                                                {_.join(_.slice(__searchSuggestionSplit, __startIndex + _.size(__typedCharactersSearchSplit)), '')}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                </>
                                                            );
                                                        })()
                                                    }
                                                </span>
                                            </FloatingLabel>
                                            {
                                                (!_.isEmpty(watch('_searchInput')) || !_.isEmpty(_typedCharactersSearch))
                                                    ?
                                                    <div className='_searchButton __close'
                                                        onClick={() => {
                                                            /* calling setValue from react-hook-form only updates the value of the specified field, it does not trigger any event handlers associated with that field in useCombobox */
                                                            setValue('_searchInput', '');
                                                            _handleChange('');
                                                        }}
                                                    >
                                                    </div>
                                                    :
                                                    <div className='_searchButton'></div>
                                            }
                                            <SimpleBar className='_SimpleBar' style={{ maxHeight: '40vh' }} forceVisible='y' autoHide={false}>
                                                <ListGroup
                                                    className={`border border-0 rounded-0 d-block ${!(isOpen && __items.length) && 'hidden'}`}
                                                    {...getMenuProps()}
                                                >
                                                    {
                                                        (isOpen) &&
                                                        _.map(
                                                            __items
                                                            , (item, index) => {
                                                                return (
                                                                    <ListGroup.Item
                                                                        className={`border border-0 rounded-0 d-flex align-items-center ${highlightedIndex === index && 'bg-blue-300'} ${selectedItem === item && 'font-bold'}`}
                                                                        key={`${item.value}${index}`}
                                                                        {...getItemProps({ item, index })}
                                                                    >
                                                                        <FontAwesomeIcon icon={faMagnifyingGlass} className='me-2' />
                                                                        {item.value}
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
                            </Form>
                        </div>

                        {_.some(_user.Role, { _role_title: "Fondateur" }) && (
                            <Form>
                                <Button
                                    type="button"
                                    className="border border-0 rounded-0 inverse"
                                    variant="outline-light"
                                    onClick={() => setShowModal(true)}
                                >
                                    <div className="buttonBorders">
                                        <div className="borderTop"></div>
                                        <div className="borderRight"></div>
                                        <div className="borderBottom"></div>
                                        <div className="borderLeft"></div>
                                    </div>
                                    <span>Ajouter Administrateur.</span>
                                </Button>
                            </Form>
                        )}
                    </div>
                    <div className="_body">
                        <SimpleBar
                            style={{ maxHeight: "100%" }}
                            forceVisible="y"
                            autoHide={false}
                        >
                            <BootstrapTable
                                bootstrap4
                                keyField="_id"
                                data={
                                    _.filter(
                                        _users,
                                        (_search) => {
                                            let _filterSearch = _.map(_.filter(_userItems, (item) => { return _.includes(_.lowerCase(item.value), _.lowerCase(watch(['_searchInput'])[0])) }), (item, index) => { return (item.value) });
                                            let _lowerFilterSearch = _.map(_filterSearch, (_filter) => { return _.lowerCase(_filter) });
                                            let _lowerInformation = _.map(_.flattenDeep(_.values(_search)), (_information) => { return _.lowerCase(_information) });
                                            return _.isEmpty(watch(['_searchInput']))
                                                ?
                                                true
                                                :
                                                _.some(_lowerFilterSearch, _filter => _.includes(_lowerInformation, _filter));
                                        }
                                    )
                                }
                                columns={_columns}
                                hover
                                condensed
                                bordered={false}
                                noDataIndication={() => "Pas d'administrateurs"}
                                rowClasses={(row, rowIndex) => {
                                    // Check your condition here (example: highlight if role is "Fondateur")
                                    if (_.isEqual(_user._user_email, row._user_email)) {
                                        return "bg-light";
                                    }
                                    return "";
                                }}
                            />
                        </SimpleBar>
                    </div>
                </Card.Body>
            </Card>

            <Modal
                className="_userModal"
                show={_showModal}
                onHide={() => {
                    _handleCancel();
                    setShowModal(false);
                }}
                centered
            >
                <Form
                    onSubmit={handleSubmitUser(onSubmit, onError)}
                    className="d-flex flex-column h-100"
                >
                    <Modal.Header closeButton>
                        <Modal.Title></Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="grid">
                        {/* Header */}
                        <Row className="g-col-12 grid">
                            <Col className="g-col-3">
                                {_.isEmpty(_userToEdit) ? (
                                    <span>
                                        Ajouter Administrateur.
                                        <p className="text-muted">
                                            Veuillez remplir les informations de votre nouvel Administrateur.
                                        </p>
                                    </span>
                                ) : (
                                    <span>
                                        Paramètres.
                                        <p className="text-muted">
                                            Mettez à jour vos informations ici.
                                        </p>
                                    </span>
                                )}
                            </Col>
                        </Row>

                        {/* Public information */}
                        <Row className="g-col-12 grid">
                            <Col className="g-col-3">
                                <span>
                                    Informations publiques.
                                    <p className='text-muted'>Cela sera affiché sur votre profil.</p>
                                </span>
                            </Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="_user_lastname"
                                    className={`_formGroup ${_userLastnameFocused ? "focused" : ""
                                        }`}
                                >
                                    <FloatingLabel label="Nom." className="_formLabel">
                                        <Form.Control
                                            {...registerUser("_user_lastname")}
                                            onBlur={() => {
                                                setUserlastnameFocused(false);
                                            }}
                                            onFocus={() => setUserlastnameFocused(true)}
                                            placeholder="Nom."
                                            autoComplete="new-password"
                                            type="text"
                                            className={`_formControl border rounded-0
                                                ${errorsUser._user_lastname
                                                    ? "border-danger"
                                                    : !_.isEmpty(
                                                        watchUser(
                                                            "_user_lastname"
                                                        )
                                                    ) && "border-success"
                                                }`}
                                            name="_user_lastname"
                                        />
                                        {errorsUser._user_lastname && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25${!_.isEmpty(watchUser("_user_lastname"))
                                                    ? "_fieldNotEmpty"
                                                    : ""
                                                    }`}
                                            >
                                                {errorsUser._user_lastname.message}
                                            </Form.Text>
                                        )}
                                        {!_.isEmpty(watchUser("_user_lastname")) && (
                                            <div
                                                className="__close"
                                                onClick={() => {
                                                    resetFieldUser("_user_lastname");
                                                }}
                                            ></div>
                                        )}
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="_user_firstname"
                                    className={`_formGroup ${_userFirstnameFocused ? "focused" : ""
                                        }`}
                                >
                                    <FloatingLabel label="Prénom." className="_formLabel">
                                        <Form.Control
                                            {...registerUser("_user_firstname")}
                                            onBlur={() => {
                                                setUserfirstnameFocused(false);
                                            }}
                                            onFocus={() => setUserfirstnameFocused(true)}
                                            placeholder="Prénom."
                                            autoComplete="new-password"
                                            type="text"
                                            className={`_formControl border rounded-0
                                                ${errorsUser._user_firstname
                                                    ? "border-danger"
                                                    : !_.isEmpty(
                                                        watchUser(
                                                            "_user_firstname"
                                                        )
                                                    ) && "border-success"
                                                }`}
                                            name="_user_firstname"
                                        />
                                        {errorsUser._user_firstname && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_firstname"))
                                                    ? "_fieldNotEmpty"
                                                    : ""
                                                    }`}
                                            >
                                                {errorsUser._user_firstname.message}
                                            </Form.Text>
                                        )}
                                        {!_.isEmpty(watchUser("_user_firstname")) && (
                                            <div
                                                className="__close"
                                                onClick={() => {
                                                    resetFieldUser("_user_firstname");
                                                }}
                                            ></div>
                                        )}
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="g-col-12 grid">
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="_user_email"
                                    className={`_formGroup ${_userEmailFocused ? "focused" : ""}`}
                                >
                                    <FloatingLabel label="Email." className="_formLabel">
                                        <Form.Control
                                            {...registerUser("_user_email")}
                                            onBlur={() => {
                                                setUseremailFocused(false);
                                            }}
                                            onFocus={() => setUseremailFocused(true)}
                                            placeholder="Email."
                                            autoComplete="new-password"
                                            type="text"
                                            className={`_formControl border rounded-0
                                                ${errorsUser._user_email
                                                    ? "border-danger"
                                                    : !_.isEmpty(
                                                        watchUser("_user_email")
                                                    ) && "border-success"
                                                }`}
                                            name="_user_email"
                                        />
                                        {errorsUser._user_email && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_email"))
                                                    ? "_fieldNotEmpty"
                                                    : ""
                                                    }`}
                                            >
                                                {errorsUser._user_email.message}
                                            </Form.Text>
                                        )}
                                        {!_.isEmpty(watchUser("_user_email")) && (
                                            <div
                                                className="__close"
                                                onClick={() => {
                                                    resetFieldUser("_user_email");
                                                }}
                                            ></div>
                                        )}
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="_user_username"
                                    className={`_formGroup ${_userUsernameFocused ? "focused" : ""
                                        }`}
                                >
                                    <FloatingLabel label="Username." className="_formLabel">
                                        <Form.Control
                                            {...registerUser("_user_username")}
                                            onBlur={() => {
                                                setUserusernameFocused(false);
                                            }}
                                            onFocus={() => setUserusernameFocused(true)}
                                            placeholder="Username."
                                            autoComplete="new-password"
                                            type="text"
                                            className={`_formControl border rounded-0
                                                ${errorsUser._user_username
                                                    ? "border-danger"
                                                    : !_.isEmpty(
                                                        watchUser(
                                                            "_user_username"
                                                        )
                                                    ) && "border-success"
                                                }`}
                                            name="_user_username"
                                        />
                                        {errorsUser._user_username && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_username"))
                                                    ? "_fieldNotEmpty"
                                                    : ""
                                                    }`}
                                            >
                                                {errorsUser._user_username.message}
                                            </Form.Text>
                                        )}
                                        {!_.isEmpty(watchUser("_user_username")) && (
                                            <div
                                                className="__close"
                                                onClick={() => {
                                                    resetFieldUser("_user_username");
                                                }}
                                            ></div>
                                        )}
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Contact information */}
                        <Row className="g-col-12 grid">
                            <Col className="g-col-3">
                                <span>
                                    Coordonnées.
                                    <p className='text-muted'>Mettez à jour vos informations d'adresse.</p>
                                </span>
                            </Col>
                            <Col className="g-col-4">
                                <Controller
                                    name="_user_country._country"
                                    control={controlUser}
                                    render={({ field }) => (
                                        <Form.Group
                                            controlId="_user_country"
                                            className={`_formGroup ${_userCountryFocused ? "focused" : ""
                                                }`}
                                        >
                                            <FloatingLabel
                                                label="Pays."
                                                className="_formLabel _autocomplete"
                                                {...getLabelPropsCountry()}
                                            >
                                                <Form.Control
                                                    {...getInputPropsCountry({
                                                        ...field,
                                                        onFocus: _handleFocusCountry,
                                                        onBlur: _handleBlurCountry,
                                                    })}
                                                    placeholder="Pays."
                                                    className={`_formControl border rounded-0 ${errorsUser._user_country ? "border-danger" : ""
                                                        } ${!_.isEmpty(_typedCharactersCountry) ? "_typing" : ""
                                                        }`}
                                                />
                                                <span className="d-flex align-items-center _autocorrect">
                                                    {(() => {
                                                        const __countrySuggestionSplit = _.split(
                                                            _countrySuggestion,
                                                            ""
                                                        );
                                                        const __typedCharactersCountrySplit = _.split(
                                                            _typedCharactersCountry,
                                                            ""
                                                        );
                                                        const __startIndex = _.indexOf(
                                                            __countrySuggestionSplit,
                                                            _.head(__typedCharactersCountrySplit)
                                                        );

                                                        return (
                                                            <>
                                                                {__startIndex !== -1 && (
                                                                    <>
                                                                        <p className="_countrySuggestion">
                                                                            {_.join(
                                                                                _.slice(
                                                                                    __countrySuggestionSplit,
                                                                                    0,
                                                                                    __startIndex
                                                                                ),
                                                                                ""
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                                <p className="_typedCharacters">
                                                                    {_typedCharactersCountry}
                                                                </p>
                                                                {__startIndex !== -1 && (
                                                                    <>
                                                                        <p className="_countrySuggestion">
                                                                            {_.join(
                                                                                _.slice(
                                                                                    __countrySuggestionSplit,
                                                                                    __startIndex +
                                                                                    _.size(
                                                                                        __typedCharactersCountrySplit
                                                                                    )
                                                                                ),
                                                                                ""
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </span>
                                                {errorsUser._user_country && (
                                                    <Form.Text
                                                        className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(_userToEdit) &&
                                                            (!_.isEmpty(_typedCharactersCountry) ||
                                                                !_.isEqual(field.value, {
                                                                    _code: "",
                                                                    _country: "",
                                                                }))
                                                            ? "_fieldNotEmpty"
                                                            : ""
                                                            }`}
                                                    >
                                                        {errorsUser._user_country.message}
                                                    </Form.Text>
                                                )}
                                                {!_.isEmpty(_userToEdit) &&
                                                    (!_.isEmpty(_typedCharactersCountry) ||
                                                        !_.isEmpty(watchUser("_user_country._country"))) ? (
                                                    <div
                                                        className="__close"
                                                        onClick={() => {
                                                            setValueUser("_user_country", {
                                                                _code: "",
                                                                _country: "",
                                                            });
                                                            _handleChangeCountry("");
                                                        }}
                                                    ></div>
                                                ) : null}
                                            </FloatingLabel>
                                            <SimpleBar
                                                className="_SimpleBar"
                                                style={{ maxHeight: "40vh" }}
                                                forceVisible="y"
                                                autoHide={false}
                                            >
                                                <ListGroup
                                                    className={`border border-0 rounded-0 d-block ${!(isOpenCountry && __countryItems.length) &&
                                                        "hidden"
                                                        }`}
                                                    {...getMenuPropsCountry()}
                                                >
                                                    {isOpenCountry &&
                                                        _.map(__countryItems, (item, index) => {
                                                            return (
                                                                <ListGroup.Item
                                                                    className={`border border-0 rounded-0 d-flex align-items-center ${highlightedIndexCountry === index &&
                                                                        "bg-blue-300"
                                                                        } ${selectedItemCountry === item && "font-bold"
                                                                        }`}
                                                                    key={`${item.value}${index}`}
                                                                    {...getItemPropsCountry({ item, index })}
                                                                >
                                                                    <span>
                                                                        <img src={item._flag} alt={item._country} />
                                                                    </span>
                                                                    <span>{item._country}</span>
                                                                </ListGroup.Item>
                                                            );
                                                        })}
                                                </ListGroup>
                                            </SimpleBar>
                                        </Form.Group>
                                    )}
                                />
                            </Col>
                            <Col className="g-col-4">
                                <Controller
                                    name="_user_city"
                                    control={controlUser}
                                    render={({ field }) => (
                                        <Form.Group
                                            controlId="_user_city"
                                            className={`_formGroup ${_userCityFocused ? "focused" : ""
                                                }`}
                                        >
                                            <FloatingLabel
                                                label="Ville."
                                                className="_formLabel _autocomplete"
                                                {...getLabelPropsCity()}
                                            >
                                                <Form.Control
                                                    {...getInputPropsCity({
                                                        ...field,
                                                        onFocus: _handleFocusCity,
                                                        onBlur: _handleBlurCity,
                                                    })}
                                                    placeholder="Ville."
                                                    className={`_formControl border rounded-0 ${errorsUser._user_city ? "border-danger" : ""
                                                        } ${!_.isEmpty(_typedCharactersCity) ? "_typing" : ""
                                                        }`}
                                                    disabled={
                                                        _.isEmpty(_userToEdit) ||
                                                        _.isEmpty(watchUser("_user_country._country"))
                                                    }
                                                />
                                                <span className="d-flex align-items-center _autocorrect">
                                                    {(() => {
                                                        const __citySuggestionSplit = _.split(
                                                            _citySuggestion,
                                                            ""
                                                        );
                                                        const __typedCharactersCitySplit = _.split(
                                                            _typedCharactersCity,
                                                            ""
                                                        );
                                                        const __startIndex = _.indexOf(
                                                            __citySuggestionSplit,
                                                            _.head(__typedCharactersCitySplit)
                                                        );

                                                        return (
                                                            <>
                                                                {__startIndex !== -1 && (
                                                                    <>
                                                                        <p className="_citySuggestion">
                                                                            {_.join(
                                                                                _.slice(
                                                                                    __citySuggestionSplit,
                                                                                    0,
                                                                                    __startIndex
                                                                                ),
                                                                                ""
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                                <p className="_typedCharacters">
                                                                    {_typedCharactersCity}
                                                                </p>
                                                                {__startIndex !== -1 && (
                                                                    <>
                                                                        <p className="_citySuggestion">
                                                                            {_.join(
                                                                                _.slice(
                                                                                    __citySuggestionSplit,
                                                                                    __startIndex +
                                                                                    _.size(__typedCharactersCitySplit)
                                                                                ),
                                                                                ""
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </span>
                                                {errorsUser._user_city && (
                                                    <Form.Text
                                                        className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(_userToEdit) &&
                                                            (!_.isEmpty(_typedCharactersCity) ||
                                                                !_.isEqual(field.value, {
                                                                    _code: "",
                                                                    _city: "",
                                                                }))
                                                            ? "_fieldNotEmpty"
                                                            : ""
                                                            }`}
                                                    >
                                                        {errorsUser._user_city.message}
                                                    </Form.Text>
                                                )}
                                                {!_.isEmpty(_userToEdit) &&
                                                    (!_.isEmpty(_typedCharactersCity) ||
                                                        !_.isEmpty(watchUser("_user_city"))) ? (
                                                    <div
                                                        className="__close"
                                                        onClick={() => {
                                                            setValueUser("_user_city", "");
                                                            _handleChangeCity("");
                                                        }}
                                                    ></div>
                                                ) : null}
                                            </FloatingLabel>
                                            <SimpleBar
                                                className="_SimpleBar"
                                                style={{ maxHeight: "40vh" }}
                                                forceVisible="y"
                                                autoHide={false}
                                            >
                                                <ListGroup
                                                    className={`border border-0 rounded-0 d-block ${!(isOpenCity && __cityItems.length) && "hidden"
                                                        }`}
                                                    {...getMenuPropsCity()}
                                                >
                                                    {isOpenCity &&
                                                        _.map(__cityItems, (item, index) => {
                                                            return (
                                                                <ListGroup.Item
                                                                    className={`border border-0 rounded-0 d-flex align-items-center ${highlightedIndexCity === index &&
                                                                        "bg-blue-300"
                                                                        } ${selectedItemCity === item && "font-bold"
                                                                        }`}
                                                                    key={`${item.value}${index}`}
                                                                    {...getItemPropsCity({ item, index })}
                                                                >
                                                                    <span>{item._city}</span>
                                                                </ListGroup.Item>
                                                            );
                                                        })}
                                                </ListGroup>
                                            </SimpleBar>
                                        </Form.Group>
                                    )}
                                />
                            </Col>
                        </Row>
                        <Row className="g-col-12 grid">
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="_user_phone"
                                    className={`_formGroup ${_userPhoneFocused ? "focused" : ""}`}
                                >
                                    <FloatingLabel label="Téléphone." className="_formLabel">
                                        <Form.Control
                                            {...registerUser("_user_phone")}
                                            onBlur={() => {
                                                setUserphoneFocused(false);
                                            }}
                                            onFocus={() => setUserphoneFocused(true)}
                                            placeholder="Téléphone."
                                            autoComplete="new-password"
                                            type="text"
                                            className={`_formControl border rounded-0
                                                ${errorsUser._user_phone
                                                    ? "border-danger"
                                                    : !_.isEmpty(
                                                        watchUser("_user_phone")
                                                    ) && "border-success"
                                                }`}
                                            name="_user_phone"
                                        />
                                        {errorsUser._user_phone && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_phone"))
                                                    ? "_fieldNotEmpty"
                                                    : ""
                                                    }`}
                                            >
                                                {errorsUser._user_phone.message}
                                            </Form.Text>
                                        )}
                                        {!_.isEmpty(watchUser("_user_phone")) && (
                                            <div
                                                className="__close"
                                                onClick={() => {
                                                    resetFieldUser("_user_phone");
                                                }}
                                            ></div>
                                        )}
                                    </FloatingLabel>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Security */}
                        {/* Resetting password if forgotten, but the motherfucker is already logged in, so WTF */}
                        {!_.isEmpty(_userToEdit) ? (
                            <>
                                <Row className="g-col-12 grid">
                                    <Col className="g-col-3">
                                        <span>
                                            Sécurité.
                                            <p className='text-muted'>Mettez à jour votre mot de passe.</p>
                                        </span>
                                    </Col>
                                    <Col className="g-col-4">
                                        <Form.Group
                                            controlId="_user_password"
                                            className={`_formGroup ${_userPasswordFocused ? "focused" : ""
                                                }`}
                                        >
                                            <FloatingLabel label="Mot de passe." className="_formLabel">
                                                <Form.Control
                                                    {...registerUser("_user_password")}
                                                    onBlur={() => {
                                                        setUserpasswordFocused(false);
                                                    }}
                                                    onFocus={() => setUserpasswordFocused(true)}
                                                    placeholder="Mot de passe."
                                                    autoComplete="new-password"
                                                    type="password"
                                                    className={`_formControl border rounded-0
                                                ${errorsUser._user_password
                                                            ? "border-danger"
                                                            : !_.isEmpty(
                                                                watchUser(
                                                                    "_user_password"
                                                                )
                                                            ) && "border-success"
                                                        }`}
                                                    name="_user_password"
                                                />
                                                {errorsUser._user_password && (
                                                    <Form.Text
                                                        className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_password"))
                                                            ? "_fieldNotEmpty"
                                                            : ""
                                                            }`}
                                                    >
                                                        {errorsUser._user_password.message}
                                                    </Form.Text>
                                                )}
                                                {!_.isEmpty(watchUser("_user_password")) && (
                                                    <div
                                                        className="__close"
                                                        onClick={() => {
                                                            resetFieldUser("_user_password");
                                                        }}
                                                    ></div>
                                                )}
                                            </FloatingLabel>
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row className="g-col-12 grid">
                                    <Col className="g-col-3"></Col>
                                    <Col className="g-col-4">
                                        <Form.Group
                                            controlId="_user_passwordNew"
                                            className={`_formGroup ${_userPasswordNewFocused ? "focused" : ""
                                                }`}
                                        >
                                            <FloatingLabel
                                                label="Nouveau Mot de passe."
                                                className="_formLabel"
                                            >
                                                <Form.Control
                                                    {...registerUser("_user_passwordNew")}
                                                    onBlur={() => {
                                                        setUserpasswordNewFocused(false);
                                                    }}
                                                    onFocus={() => setUserpasswordNewFocused(true)}
                                                    placeholder="Nouveau Mot de passe."
                                                    autoComplete="new-password"
                                                    type="password"
                                                    className={`_formControl border rounded-0
                                                ${errorsUser._user_passwordNew
                                                            ? "border-danger"
                                                            : !_.isEmpty(
                                                                watchUser(
                                                                    "_user_passwordNew"
                                                                )
                                                            ) && "border-success"
                                                        }`}
                                                    name="_user_passwordNew"
                                                />
                                                {errorsUser._user_passwordNew && (
                                                    <Form.Text
                                                        className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_lastname"))
                                                            ? "_fieldNotEmpty"
                                                            : ""
                                                            }`}
                                                    >
                                                        {errorsUser._user_passwordNew.message}
                                                    </Form.Text>
                                                )}
                                                {!_.isEmpty(watchUser("_user_passwordNew")) && (
                                                    <div
                                                        className="__close"
                                                        onClick={() => {
                                                            resetFieldUser("_user_passwordNew");
                                                        }}
                                                    ></div>
                                                )}
                                            </FloatingLabel>
                                        </Form.Group>
                                    </Col>
                                    <Col className="g-col-4">
                                        <Form.Group
                                            controlId="_user_passwordNewConfirm"
                                            className={`_formGroup ${_userPasswordNewConfirmFocused ? "focused" : ""
                                                }`}
                                        >
                                            <FloatingLabel
                                                label="Confirmer Mot de passe."
                                                className="_formLabel"
                                            >
                                                <Form.Control
                                                    {...registerUser("_user_passwordNewConfirm")}
                                                    onBlur={() => {
                                                        setUserpasswordNewConfirmFocused(false);
                                                    }}
                                                    onFocus={() => setUserpasswordNewConfirmFocused(true)}
                                                    placeholder="Confirmer Mot de passe."
                                                    autoComplete="new-password"
                                                    type="password"
                                                    className={`_formControl border rounded-0
                                                ${errorsUser._user_passwordNewConfirm
                                                            ? "border-danger"
                                                            : !_.isEmpty(
                                                                watchUser(
                                                                    "_user_passwordNewConfirm"
                                                                )
                                                            ) && "border-success"
                                                        }`}
                                                    name="_user_passwordNewConfirm"
                                                />
                                                {errorsUser._user_passwordNewConfirm && (
                                                    <Form.Text
                                                        className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_passwordNewConfirm"))
                                                            ? "_fieldNotEmpty"
                                                            : ""
                                                            }`}
                                                    >
                                                        {errorsUser._user_passwordNewConfirm.message}
                                                    </Form.Text>
                                                )}
                                                {!_.isEmpty(watchUser("_user_passwordNewConfirm")) && (
                                                    <div
                                                        className="__close"
                                                        onClick={() => {
                                                            resetFieldUser("_user_passwordNewConfirm");
                                                        }}
                                                    ></div>
                                                )}
                                            </FloatingLabel>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <Row className="g-col-12 grid">
                                <Col className="g-col-3">
                                    <span>
                                        Sécurité.
                                        <p className='text-muted'>Mettez à jour votre mot de passe.</p>
                                    </span>
                                </Col>
                                <Col className="g-col-4">
                                    <Form.Group
                                        controlId="_user_passwordNew"
                                        className={`_formGroup ${_userPasswordNewFocused ? "focused" : ""
                                            }`}
                                    >
                                        <FloatingLabel label="Nouveau Mot de passe." className="_formLabel">
                                            <Form.Control
                                                {...registerUser("_user_passwordNew")}
                                                onBlur={() => {
                                                    setUserpasswordNewFocused(false);
                                                }}
                                                onFocus={() => setUserpasswordNewFocused(true)}
                                                placeholder="Nouveau Mot de passe."
                                                autoComplete="new-password"
                                                type="password"
                                                className={`_formControl border rounded-0
                                                ${errorsUser._user_passwordNew
                                                        ? "border-danger"
                                                        : !_.isEmpty(
                                                            watchUser(
                                                                "_user_passwordNew"
                                                            )
                                                        ) && "border-success"
                                                    }`}
                                                name="_user_passwordNew"
                                            />
                                            {errorsUser._user_passwordNew && (
                                                <Form.Text
                                                    className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_lastname"))
                                                        ? "_fieldNotEmpty"
                                                        : ""
                                                        }`}
                                                >
                                                    {errorsUser._user_passwordNew.message}
                                                </Form.Text>
                                            )}
                                            {!_.isEmpty(watchUser("_user_passwordNew")) && (
                                                <div
                                                    className="__close"
                                                    onClick={() => {
                                                        resetFieldUser("_user_passwordNew");
                                                    }}
                                                ></div>
                                            )}
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                                <Col className="g-col-4">
                                    <Form.Group
                                        controlId="_user_passwordNewConfirm"
                                        className={`_formGroup ${_userPasswordNewConfirmFocused ? "focused" : ""
                                            }`}
                                    >
                                        <FloatingLabel
                                            label="Confirm Mot de passe."
                                            className="_formLabel"
                                        >
                                            <Form.Control
                                                {...registerUser("_user_passwordNewConfirm")}
                                                onBlur={() => {
                                                    setUserpasswordNewConfirmFocused(false);
                                                }}
                                                onFocus={() => setUserpasswordNewConfirmFocused(true)}
                                                placeholder="Confirm Mot de passe."
                                                autoComplete="new-password"
                                                type="password"
                                                className={`_formControl border rounded-0
                                                ${errorsUser._user_passwordNewConfirm
                                                        ? "border-danger"
                                                        : !_.isEmpty(
                                                            watchUser(
                                                                "_user_passwordNewConfirm"
                                                            )
                                                        ) && "border-success"
                                                    }`}
                                                name="_user_passwordNewConfirm"
                                            />
                                            {errorsUser._user_passwordNewConfirm && (
                                                <Form.Text
                                                    className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(watchUser("_user_passwordNewConfirm"))
                                                        ? "_fieldNotEmpty"
                                                        : ""
                                                        }`}
                                                >
                                                    {errorsUser._user_passwordNewConfirm.message}
                                                </Form.Text>
                                            )}
                                            {!_.isEmpty(watchUser("_user_passwordNewConfirm")) && (
                                                <div
                                                    className="__close"
                                                    onClick={() => {
                                                        resetFieldUser("_user_passwordNewConfirm");
                                                    }}
                                                ></div>
                                            )}
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        {/* Role */}
                        {/* Works selecting but not typing, and also the removing role after selection, and also removing after submit */}
                        {/* <Row className="g-col-12 grid _roles">
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-4">
                                <Form.Group
                                    controlId="Role"
                                    className={`_formGroup _roleGroup g-col-7 ${RoleFocused ? "focused" : ""}`}
                                >
                                    <FloatingLabel
                                        label="Roles."
                                        className="_formLabel _autocomplete"
                                        {...getLabelPropsRole()}
                                    >
                                        <Form.Control
                                            {...getInputPropsRole(
                                                {
                                                    onFocus: _handleFocusRole,
                                                    onBlur: _handleBlurRole,
                                                },
                                                {
                                                    suppressRefError: true,
                                                }
                                            )}
                                            value={inputValueRole}
                                            placeholder="Roles."
                                            className={`_formControl border border-top-0 rounded-0 ${errorsUser.Role ? "border-danger" : ""
                                                } ${!_.isEmpty(_typedCharactersRole) ? "_typing" : ""}`}
                                        />
                                        <span className="d-flex align-items-center _autocorrect">
                                            {(() => {
                                                const __roleSuggestionSplit = _.split(_roleSuggestion, "");
                                                const __typedCharactersRoleSplit = _.split(_typedCharactersRole, "");
                                                const __startIndex = _.indexOf(
                                                    __roleSuggestionSplit,
                                                    _.head(__typedCharactersRoleSplit)
                                                );

                                                return (
                                                    <>
                                                        {__startIndex !== -1 && (
                                                            <>
                                                                <p className="_roleSuggestion">
                                                                    {_.join(_.slice(__roleSuggestionSplit, 0, __startIndex), "")}
                                                                </p>
                                                            </>
                                                        )}
                                                        <p className="_typedCharacters">{_typedCharactersRole}</p>
                                                        {__startIndex !== -1 && (
                                                            <>
                                                                <p className="_roleSuggestion">
                                                                    {_.join(
                                                                        _.slice(
                                                                            __roleSuggestionSplit,
                                                                            __startIndex + _.size(__typedCharactersRoleSplit)
                                                                        ),
                                                                        ""
                                                                    )}
                                                                </p>
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </span>
                                        {RoleError && (
                                            <Form.Text
                                                className={`bg-danger text-danger d-flex align-items-start bg-opacity-25 ${!_.isEmpty(inputValueRole) ? "_fieldNotEmpty" : ""
                                                    }`}
                                            >
                                                {RoleError}
                                            </Form.Text>
                                        )}
                                        {(!_.isEmpty(inputValueRole) || !_.isEmpty(_typedCharactersRole)) && (
                                            <div
                                                className="_roleButton __close"
                                                onClick={() => {
                                                    _handleChangeRole("");
                                                }}
                                            ></div>
                                        )}
                                        <div className="__selectedRoles">
                                            <SimpleBar
                                                style={{ maxWidth: "100%", height: "7vh" }}
                                                forceVisible="x"
                                                autoHide={true} // Hide scrollbar when not hovered
                                            >
                                                <ul className="text-muted roles d-flex flex-row justify-content-start align-items-center">
                                                    {_.map(watchUser("Role"), (item, index) => {
                                                        return (
                                                            <li
                                                                key={`${item}${index}`}
                                                                className={`role_item rounded-0 d-flex align-items-center`}
                                                                {...getSelectedItemProps({
                                                                    selectedItem: item,
                                                                    index,
                                                                })}
                                                                data-order={`${index}`}
                                                            >
                                                                <p>{_.upperFirst(item._role_title)}.</p>
                                                                <div
                                                                    className="__close"
                                                                    onClick={() => {
                                                                        _handleRemoveRole(index);
                                                                    }}
                                                                ></div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </SimpleBar>
                                        </div>
                                    </FloatingLabel>
                                    <SimpleBar
                                        className="_SimpleBar"
                                        style={{
                                            zIndex: '1',
                                            maxHeight: "10.3vh"
                                        }}
                                        forceVisible="y"
                                        autoHide={false}
                                    >
                                        <ListGroup
                                            className={`border border-top-0 rounded-0 text-muted roles d-flex flex-row align-items-start ${!(isOpenRole && __roleItems.length) && "hidden"
                                                }`}
                                            {...getMenuPropsRole({}, { suppressRefError: true })}
                                        >
                                            {isOpenRole &&
                                                _.map(__roleItems, (item, index) => {
                                                    return (
                                                        <ListGroup.Item
                                                            className={`role_item border border-0 rounded-0 d-flex align-items-center ${highlightedIndexRole === index && "bg-blue-300"
                                                                } ${selectedItemRole === item && "font-bold"}`}
                                                            key={`${item._role_title}${index}`}
                                                            {...getItemPropsRole({
                                                                item,
                                                                index,
                                                            })}
                                                        >
                                                            <p>{_.upperFirst(item._role_title)}.</p>
                                                        </ListGroup.Item>
                                                    );
                                                })}
                                        </ListGroup>
                                    </SimpleBar>
                                </Form.Group>
                            </Col>
                        </Row> */}
                    </Modal.Body>
                    <Modal.Footer>
                        <Row className="grid w-100">
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-3"></Col>
                            <Col className="g-col-3 d-flex justify-content-end">
                                {
                                    //Upon click it just disapears or appears too fast
                                    !_.isEmpty(_userToEdit) && (
                                        <Button
                                            type="button"
                                            className="border border-0 rounded-0 _red w-50"
                                            variant=""
                                            onClick={() => {
                                                _handleCancel();
                                                setShowModal(false);
                                            }}
                                        >
                                            Annuler<b className="pink_dot">.</b>
                                        </Button>
                                    )
                                }
                                <Button
                                    type="submit"
                                    className={`border border-0 rounded-0 inverse w-50 ms-1 ${_.isEmpty(_userToEdit) ? "" : "_edit"
                                        }`}
                                    variant="outline-light"
                                >
                                    <div className="buttonBorders">
                                        <div className="borderTop"></div>
                                        <div className="borderRight"></div>
                                        <div className="borderBottom"></div>
                                        <div className="borderLeft"></div>
                                    </div>
                                    <span>
                                        {!_.isEmpty(_userToEdit) ? "Modifier." : "Ajouter."}
                                        <FontAwesomeIcon icon={faPen} />
                                    </span>
                                </Button>
                            </Col>
                        </Row>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal
                className="_feedbackModal"
                show={_showModalForm}
                onHide={() => {
                    _handleCancel();
                    setShowModalForm(false);
                }}
                centered
            >
                <Form>
                    <Modal.Header closeButton>
                        <Modal.Title>{_modalHeaderForm}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="text-muted">
                        <pre>{_modalBodyForm}</pre>
                    </Modal.Body>
                    <Modal.Footer>
                        <Row className="grid w-100">
                            <Col className="g-col-6"></Col>
                            <Col className="g-col-6 d-flex justify-content-end">
                                <Button
                                    type="button"
                                    className={`border border-0 rounded-0 w-50 ${!_.isEmpty(_userToEdit) ? "_red" : "inverse"
                                        }`}
                                    variant={`${!_.isEmpty(_userToEdit) ? "link" : "outline-light"
                                        }`}
                                    onClick={() => {
                                        _handleCancel();
                                        setShowModalForm(false);
                                    }}
                                >
                                    {!_.isEmpty(_userToEdit) ? (
                                        <>
                                            Annuler<b className="pink_dot">.</b>
                                        </>
                                    ) : (
                                        <>
                                            <div className="buttonBorders">
                                                <div className="borderTop"></div>
                                                <div className="borderRight"></div>
                                                <div className="borderBottom"></div>
                                                <div className="borderLeft"></div>
                                            </div>
                                            <span>
                                                Fermer<b className="pink_dot">.</b>
                                            </span>
                                        </>
                                    )}
                                </Button>
                                {!_.isEmpty(_userToEdit) && (
                                    <Button
                                        type="button"
                                        className="border border-0 rounded-0 inverse _red w-50 ms-1"
                                        variant="outline-light"
                                        onClick={() => {
                                            _handleDelete(_userToEdit._id);
                                            setShowModalForm(false);
                                        }}
                                    >
                                        <div className="buttonBorders">
                                            <div className="borderTop"></div>
                                            <div className="borderRight"></div>
                                            <div className="borderBottom"></div>
                                            <div className="borderLeft"></div>
                                        </div>
                                        <span>
                                            Supprimer<b className="pink_dot">.</b>
                                        </span>
                                    </Button>
                                )}
                            </Col>
                        </Row>
                        {_modalIconForm}
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default PUsers;