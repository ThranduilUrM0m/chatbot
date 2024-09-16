import React, { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { useCombobox } from "downshift";
import ListGroup from "react-bootstrap/ListGroup";
import Form from "react-bootstrap/Form";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Card from "react-bootstrap/Card";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import BootstrapTable from "react-bootstrap-table-next";
import {
    faHouse,
    faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";
import axios from "axios";
import moment from 'moment';
import _useStore from "../../../store";
import SimpleBar from "simplebar-react";

import "simplebar-react/dist/simplebar.min.css";
import { io } from "socket.io-client";

const _socketURL = _.isEqual(process.env.NODE_ENV, "production")
    ? window.location.hostname
    : "localhost:5000";
const _socket = io(_socketURL, { transports: ["websocket", "polling"] });

const PConversations = (props) => {
    const _conversations = _useStore.useConversationStore((state) => state._conversations);
    const setConversations = _useStore.useConversationStore((state) => state["_conversations_SET_STATE"]);

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

    /* Downshift _searchInput */
    const [_typedCharactersSearch, setTypedCharactersSearch] = useState('');
    const [_searchSuggestion, setSearchSuggestion] = useState('');
    const [__items, setItems] = useState(
        _.orderBy(
            _.uniqBy(
                _.map(_conversations, (__c) => ({
                    value: __c._conversation_user,  // Extract _conversation_user for searching
                })),
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
                    _.map(_conversations, (__c) => ({
                        value: __c._conversation_user,  // Extract _conversation_user for searching
                    })),
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

    /* Bootstrap Table For Conversations */
    const _columns = [
        {
            dataField: "_conversation_user",
            text: "Référence d'Utilisateur",
            sort: true,
            formatter: (cell, row) => {
                return (
                    <span className="d-flex flex-column justify-content-center me-auto">
                        <p className="m-0">
                            {cell}
                        </p>
                    </span>
                );
            },
        },
        {
            dataField: "chatHistory",
            text: "Total de messages de l'utilisateur",
            sort: true,
            formatter: (cell) => {
                // Filter messages where the role is 'conversation' and count them
                return (
                    <p className="m-0">
                        {_.size(_.filter(cell, (__m) => __m.role === 'user'))}
                    </p>
                );
            },
        },
        {
            dataField: "chatHistory",
            text: "Date du premier message",
            formatter: (cell) => {
                // Find the first message by sorting by createdAt
                return (
                    <p className="m-0">
                        {
                            _.minBy(cell, (item) => moment(item.createdAt).valueOf()) // Use moment().valueOf() to get the timestamp
                                ? moment(_.minBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('DD/MM/YYYY')
                                : 'N/A'
                        }
                    </p>
                );
            },
        },
        {
            dataField: "chatHistory",
            text: "Date du dernier message",
            formatter: (cell) => {
                // Find the latest message by sorting by createdAt
                return (
                    <p className="m-0">
                        {
                            _.maxBy(cell, (item) => moment(item.createdAt).valueOf()) // Use moment().valueOf() to get the timestamp
                                ? moment(_.maxBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('DD/MM/YYYY')
                                : 'N/A'
                        }
                    </p>
                );
            },
        },
        {
            dataField: "totalAssistantMessages",
            text: "Total de messages de l'assistant",
            sort: true,
            formatter: (cell) => {
                return (
                    <p className="m-0">{cell}.</p>
                );
            },
        },
        {
            dataField: "createdAt",
            text: "Durée de la conversation",
            formatter: (cell, row) => {
                return (
                    <p className="m-0">
                        {
                            moment().diff(moment(cell), 'days') >= 1
                                ? `${moment().diff(moment(cell), 'days')} jours`
                                : `${moment().diff(moment(cell), 'hours')} heures`
                        }
                    </p>
                );
            },
        },
        {
            dataField: "totalResponseTime",
            text: "Temps de réponse total",
            sort: true,
            formatter: (cell) => {
                // Convert milliseconds to a duration object
                const duration = moment.duration(cell);
                const hours = Math.floor(duration.asHours());
                const minutes = Math.floor(duration.asMinutes()) % 60;
                const seconds = Math.floor(duration.asSeconds()) % 60;

                return (
                    <p className="m-0">
                        {hours > 0 ? `${hours} heures ` : ''}
                        {minutes > 0 ? `${minutes} minutes ` : ''}
                        {seconds > 0 ? `${seconds} secondes` : '0 secondes'}
                    </p>
                );
            },
        },
        {
            dataField: "avgResponseTime",
            text: "Temps de réponse moyen",
            sort: true,
            formatter: (cell) => {
                // Convert milliseconds to a duration object
                const duration = moment.duration(cell);
                const hours = Math.floor(duration.asHours());
                const minutes = Math.floor(duration.asMinutes()) % 60;
                const seconds = Math.floor(duration.asSeconds()) % 60;

                return (
                    <p className="m-0">
                        {hours > 0 ? `${hours} heures ` : ''}
                        {minutes > 0 ? `${minutes} minutes ` : ''}
                        {seconds > 0 ? `${seconds} secondes` : '0 secondes'}
                    </p>
                );
            },
        },
        {
            dataField: "totalInactivityTime",
            text: "Temps d'inactivité total",
            sort: true,
            formatter: (cell) => {
                // Convert milliseconds to a duration object
                const duration = moment.duration(cell);
                const hours = Math.floor(duration.asHours());
                const minutes = Math.floor(duration.asMinutes()) % 60;
                const seconds = Math.floor(duration.asSeconds()) % 60;

                return (
                    <p className="m-0">
                        {hours > 0 ? `${hours} heures ` : ''}
                        {minutes > 0 ? `${minutes} minutes ` : ''}
                        {seconds > 0 ? `${seconds} secondes` : '0 secondes'}
                    </p>
                );
            },
        }
    ];
    /* Bootstrap Table For Conversations */

    const _getConversations = useCallback(async () => {
        try {
            axios("/api/conversation")
                .then((response) => {
                    setConversations(response.data._conversations);
                })
                .catch((error) => {
                    console.log(error);
                });
        } catch (error) {
            console.log(error);
        }
    }, [setConversations]);

    useEffect(() => {
        _getConversations();

        return () => {
            _socket.off('newConversation');
            _socket.off('messageSent');
        };
    }, [_getConversations]);

    return (
        <div className='_pane _conversations d-flex flex-column'>
            <Card className="rounded-0">
                <Card.Body className="border border-0 rounded-0 no-shadow">
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
                                <FontAwesomeIcon icon={faMessage} />
                                <span className="w-100 g-col-11">
                                    <p>
                                        Conversations<b className="pink_dot">.</b>
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
                    </div>
                    <div className="_body flex-grow-1">
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
                                        _conversations,
                                        (_search) => {
                                            // Extract the search input value
                                            let searchInput = _.lowerCase(watch('_searchInput') || '');

                                            // Extract the _conversation_user from each conversation
                                            let userSearchValue = _.lowerCase(_search._conversation_user);

                                            // If search input is empty, return all conversations
                                            if (_.isEmpty(searchInput)) {
                                                return true;
                                            }

                                            // Otherwise, return only those where the _conversation_user matches the search input
                                            return _.includes(userSearchValue, searchInput);
                                        }
                                    )
                                }
                                columns={_columns}
                                hover
                                condensed
                                bordered={false}
                                noDataIndication={() => "Pas de Conversations"}
                            />
                        </SimpleBar>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}

export default PConversations;