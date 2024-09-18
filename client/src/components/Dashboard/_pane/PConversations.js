import React, { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import Form from "react-bootstrap/Form";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Card from "react-bootstrap/Card";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import BootstrapTable from "react-bootstrap-table-next";
import Dropdown from 'react-bootstrap/Dropdown';
import {
    faHouse
} from "@fortawesome/free-solid-svg-icons";
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";
import axios from "axios";
import moment from 'moment';
import _useStore from "../../../store";
import SimpleBar from "simplebar-react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import "simplebar-react/dist/simplebar.min.css";
import { io } from "socket.io-client";

const _socketURL = _.isEqual(process.env.NODE_ENV, "production")
    ? window.location.hostname
    : "localhost:5000";
const _socket = io(_socketURL, { transports: ["websocket", "polling"] });

const PConversations = (props) => {
    moment.locale('fr');
    
    const _conversations = _useStore.useConversationStore((state) => state._conversations);
    const setConversations = _useStore.useConversationStore((state) => state["_conversations_SET_STATE"]);

    const _validationSchema = Yup
        .object()
        .shape({
            _selectedDate: Yup.date().nullable()
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
            _selectedDate: null
        }
    });

    // Mapping _selectedTimespan to French labels
    const timespanLabels = {
        currentYear: "Année en cours",
        currentMonth: "Mois en cours",
        currentWeek: "Semaine en cours",
        currentDay: "Aujourd'hui",
        currentHour: "Heure actuelle"
    };

    // State for selected timespan
    const [_selectedDate, setSelectedDate] = useState(null);
    const [_selectedTimespan, setSelectedTimespan] = useState('currentYear');

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
    }, [_getConversations]);

    const filteredConversations = _conversations.filter(conversation => {
        const matchesDate = _selectedDate
            ? _.some(conversation.chatHistory, (message) =>
                moment(message.updatedAt).isSame(_selectedDate, 'day')
            )
            : true;

        const updatedAt = moment(conversation.updatedAt);

        // Apply timespan filtering
        let matchesTimespan = true;
        switch (_selectedTimespan) {
            case 'currentYear':
                matchesTimespan = updatedAt.isSame(moment(), 'year');
                break;
            case 'currentMonth':
                matchesTimespan = updatedAt.isSame(moment(), 'month');
                break;
            case 'currentWeek':
                matchesTimespan = updatedAt.isSame(moment(), 'week');
                break;
            case 'currentDay':
                matchesTimespan = updatedAt.isSame(moment(), 'day');
                break;
            case 'currentHour':
                matchesTimespan = updatedAt.isSame(moment(), 'hour');
                break;
            default:
                matchesTimespan = true;
        }

        return matchesDate && matchesTimespan;
    });

    /* Bootstrap Table For Conversations */
    const _columns = [
        {
            dataField: 'rowNumber', // This is a placeholder field name
            text: '#', // Header text for the row number column
            headerAlign: "center",
            formatter: (cell, row, rowIndex) => {
                return (
                    <p className="m-0 text-center">
                        {rowIndex + 1} {/* Display the row number (starting from 1) */}
                    </p>
                );
            },
            sort: false // Optional: Disable sorting for the row number column
        },
        {
            dataField: "chatHistory",
            text: "Date premier message",
            headerAlign: "center",
            formatter: (cell) => {
                // Find the first message by sorting by createdAt
                return (
                    <p className="m-0 text-center">
                        {
                            _.minBy(cell, (item) => moment(item.createdAt).valueOf()) // Use moment().valueOf() to get the timestamp
                                ? moment(_.minBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('MMMM Do YYYY')
                                : 'N/A'
                        }
                    </p>
                );
            },
        },
        {
            dataField: "chatHistory",
            text: "Date dernier message",
            headerAlign: "center",
            formatter: (cell) => {
                // Find the latest message by sorting by createdAt
                return (
                    <p className="m-0 text-center">
                        {
                            _.maxBy(cell, (item) => moment(item.createdAt).valueOf()) // Use moment().valueOf() to get the timestamp
                                ? moment(_.maxBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('MMMM Do YYYY')
                                : 'N/A'
                        }
                    </p>
                );
            },
        },
        {
            dataField: "chatHistory",
            text: "Total messages utilisateur",
            sort: true,
            headerAlign: "center",
            formatter: (cell) => {
                // Filter messages where the role is 'conversation' and count them
                return (
                    <p className="m-0 text-center">
                        {_.size(_.filter(cell, (__m) => __m.role === 'user'))}
                        {_.size(_.filter(cell, (__m) => __m.role === 'user')) < 0 ? ' message' : ' messages'}.
                    </p>
                );
            },
        },
        {
            dataField: "totalAssistantMessages",
            text: "Total messages assistant",
            sort: true,
            headerAlign: "center",
            formatter: (cell) => {
                return (
                    <p className="m-0 text-center">
                        {cell}
                        {_.size(cell) < 0 ? ' reply' : ' replies'}.
                    </p>
                );
            },
        },
        {
            dataField: "createdAt",
            text: "Durée conversation",
            headerAlign: "center",
            formatter: (cell, row) => {
                return (
                    <p className="m-0 text-center">
                        {
                            moment().diff(moment(cell), 'days') >= 1
                                ? `${moment().diff(moment(cell), 'days')} jours`
                                : `${moment().diff(moment(cell), 'hours')} heures`
                        }
                    </p>
                );
            },
        }
    ];
    /* Bootstrap Table For Conversations */

    return (
        <div className='_pane _conversations d-flex flex-column'>
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
                                <FontAwesomeIcon icon={faMessage} />
                                <span className="w-100 g-col-11">
                                    <p>
                                        Conversations<b className="pink_dot">.</b>
                                    </p>
                                </span>
                            </Breadcrumb.Item>
                        </Breadcrumb>

                        <div className="_search d-flex ms-auto">
                            <Form onClick={() => setFocus('_searchInput')}>
                                <Form.Group
                                    controlId='_searchInput'
                                    className='_formGroup _dateGroup'
                                >
                                    <FloatingLabel
                                        className='_formLabel _autocomplete'
                                    >
                                        <DatePicker
                                            selected={watch('_selectedDate')}
                                            onChange={date => {
                                                setSelectedDate(date);
                                                setValue('_selectedDate', date);
                                            }}
                                            className='form-control rounded-0'
                                            placeholderText='Sélectionnez une date'
                                        />
                                    </FloatingLabel>
                                </Form.Group>
                            </Form>

                            {/* Dropdown for Timespan Selection */}
                            <Dropdown className="border border-1 ms-1">
                                <Dropdown.Toggle className='border border-1'>
                                    {timespanLabels[_selectedTimespan]} {/* Display the French label */}
                                </Dropdown.Toggle>

                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setSelectedTimespan('currentYear')}>{timespanLabels['currentYear']}</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setSelectedTimespan('currentMonth')}>{timespanLabels['currentMonth']}</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setSelectedTimespan('currentWeek')}>{timespanLabels['currentWeek']}</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setSelectedTimespan('currentDay')}>{timespanLabels['currentDay']}</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setSelectedTimespan('currentHour')}>{timespanLabels['currentHour']}</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
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
                                data={filteredConversations}
                                columns={_columns}
                                hover
                                condensed
                                bordered={false}
                                classes="__conversation"
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