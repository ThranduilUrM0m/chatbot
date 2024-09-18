import React, { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import Form from "react-bootstrap/Form";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Card from "react-bootstrap/Card";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import BootstrapTable from "react-bootstrap-table-next";
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

    /* Focus State Variables */
    const [_selectedDate, setSelectedDate] = useState(null);

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
                moment(message.createdAt).isSame(_selectedDate, 'day')
            )
            : true;

        return matchesDate;
    });

    /* Bootstrap Table For Conversations */
    const _columns = [
        {
            dataField: 'rowNumber', // This is a placeholder field name
            text: '#', // Header text for the row number column
            headerAlign: "left",
            formatter: (cell, row, rowIndex) => {
                return (
                    <p className="m-0 text-muted">
                        {rowIndex + 1} {/* Display the row number (starting from 1) */}
                    </p>
                );
            },
            sort: false // Optional: Disable sorting for the row number column
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
                    </p>
                );
            },
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
                                ? moment(_.minBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('DD/MM/YYYY')
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
                                ? moment(_.maxBy(cell, (item) => moment(item.createdAt).valueOf()).createdAt).format('DD/MM/YYYY')
                                : 'N/A'
                        }
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
                    <p className="m-0 text-center">{cell}.</p>
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
        },
        {
            dataField: "avgResponseTime",
            text: "Temps réponse moyen",
            sort: true,
            headerAlign: "center",
            formatter: (cell) => {
                // Convert milliseconds to a duration object
                const duration = moment.duration(cell);
                const hours = Math.floor(duration.asHours());
                const minutes = Math.floor(duration.asMinutes()) % 60;
                const seconds = Math.floor(duration.asSeconds()) % 60;

                return (
                    <p className="m-0 text-center">
                        {hours > 0 ? `${hours} heures ` : ''}
                        {minutes > 0 ? `${minutes} minutes ` : ''}
                        {seconds > 0 ? `${seconds} secondes` : '0 secondes'}
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

                        <div className="_search  ms-auto">
                            <Form onClick={() => setFocus('_searchInput')}>
                                <Form.Group
                                    controlId='_searchInput'
                                    className='_formGroup'
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
                            {/* Show by current month, day, ... */}
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