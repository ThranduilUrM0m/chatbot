import React, { useCallback, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import Card from 'react-bootstrap/Card';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartSimple, faHouse } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import _ from 'lodash';
import _useStore from '../../../store';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

const PAudit = (props) => {
    const _conversations = _useStore.useConversationStore((state) => state._users);
    const setConversations = _useStore.useConversationStore(state => state['_conversations_SET_STATE']);

    const [data, setData] = useState({
        avgResponseTime: [],
        totalMessages: [],
        labels: [],
    });

    const _getConversations = useCallback(
        async () => {
            try {
                /* axios('/api/conversation')
                    .then((response) => {
                        setConversations(response.data._conversations);
                    })
                    .catch((error) => {
                        console.log(error);
                    }); */
            } catch (error) {
                console.log(error);
            }
        },
        [setConversations]
    );

    useEffect(() => {
        _getConversations();

        /* const getData = async () => {
            if (_conversations.length > 0) {
                const labels = _.map(_conversations, conv => new Date(conv.createdAt).toLocaleDateString());
                const avgResponseTime = _.map(_conversations, conv => conv.avgResponseTime);
                const totalMessages = _.map(_conversations, conv => conv.totalMessages);

                setData({ labels, avgResponseTime, totalMessages });
            }
        };

        getData(); */
    }, [_getConversations, _conversations]);

    const options = {
        chart: {
            id: 'conversation-metrics',
            toolbar: {
                show: true,
            },
        },
        xaxis: {
            categories: data.labels,
            title: {
                text: 'Date',
            },
        },
        yaxis: [
            {
                title: {
                    text: 'Average Response Time (ms)',
                },
            },
            {
                opposite: true,
                title: {
                    text: 'Total Messages',
                },
            }
        ],
        stroke: {
            curve: 'smooth',
        },
    };

    const series = [
        {
            name: 'Average Response Time (ms)',
            data: data.avgResponseTime,
        },
        {
            name: 'Total Messages',
            data: data.totalMessages,
        },
    ];

    return (
        <div className='_pane _audit d-flex flex-column'>
            <Card className='rounded-0'>
                <Card.Body className='border border-0 rounded-0 no-shadow'>
                    <div className='_header d-flex align-items-center'>
                        <Breadcrumb className='d-flex'>
                            <Breadcrumb.Item href='/'>
                                <FontAwesomeIcon icon={faHouse} />
                                <span className='w-100 g-col-11'>
                                    <p>Dashboard<b className='pink_dot'>.</b></p>
                                </span>
                            </Breadcrumb.Item>
                            <Breadcrumb.Item active>
                                <FontAwesomeIcon icon={faChartSimple} />
                                <span className='w-100 g-col-11'>
                                    <p>Audit<b className='pink_dot'>.</b></p>
                                </span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </div>
                    <div className='_body flex-grow-1'>
                        <SimpleBar
                            style={{ maxHeight: '100%' }}
                            forceVisible='y'
                            autoHide={false}
                        >
                            <Chart options={options} series={series} type="line" width="600" />
                        </SimpleBar>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}

export default PAudit;