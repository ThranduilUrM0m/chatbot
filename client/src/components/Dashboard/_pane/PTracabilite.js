import React, { useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import BootstrapTable from "react-bootstrap-table-next";
import Card from "react-bootstrap/Card";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import _ from "lodash";
import moment from 'moment';
import axios from "axios";
import _useStore from "../../../store";
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

const PTracabilite = (props) => {
    moment.locale('fr');
    
    /* For Notifications */
    const _notifications = _useStore.useNotificationStore((state) => state._notifications);
    const setNotifications = _useStore.useNotificationStore((state) => state["_notifications_SET_STATE"]);

    const _getNotifications = useCallback(async () => {
        axios("/api/notification")
            .then((response) => {
                setNotifications(response.data._notifications);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [setNotifications]);
    /* For Notifications */

    /* Bootstrap Table For Users */
    const _columns = [
        {
            dataField: "_notification_title",
            text: "Notification",
            sort: true,
            formatter: (cell, row) => {
                const displayValue = _.get(row._notification_user, '_user_username', _.get(row._notification_user, '_fingerprint', ''));

                const now = moment(); // Current time
                const createdTime = moment(row.createdAt); // Time from your createdAT field
                const hoursDiff = now.diff(createdTime, 'hours');
                const minutesDiff = now.diff(createdTime, 'minutes');

                return (
                    <span className="d-flex _notif flex-column justify-content-center me-auto">
                        <div className='_middleRow'>
                            <h4>{_.capitalize(cell)}</h4>
                        </div>
                        <div className='_topRow d-flex'>
                            <p className='text-muted author'>
                                <b>{displayValue ? _.capitalize(displayValue) : 'Non identifié'}</b>, {
                                    hoursDiff >= 1 ? (
                                        <span>{hoursDiff} {hoursDiff === 1 ? 'hour' : 'hours'} ago</span>
                                    ) : (
                                        // If less than an hour, show minutes ago
                                        <span>{minutesDiff} {minutesDiff === 1 ? 'minute' : 'minutes'} ago</span>
                                    )
                                }
                            </p>
                        </div>
                    </span>
                );
            },
        }
    ];
    /* Bootstrap Table For Users */

    useEffect(() => {
        _getNotifications();
    }, [_getNotifications]);

    return (
        <div className="_pane _tracabilite d-flex flex-column">
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
                                        Traçabilité<b className="pink_dot">.</b>
                                    </p>
                                </span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
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
                                data={_notifications}
                                columns={_columns}
                                hover
                                condensed
                                bordered={false}
                                noDataIndication={() => "Pas de notifications"}
                            />
                        </SimpleBar>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}

export default PTracabilite;