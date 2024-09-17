import React, { useCallback, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartSimple, faHouse } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';
// Register necessary chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const PDashboard = (props) => {
    const [data, setData] = useState({
        avgResponseTime: [],
        totalMessages: [],
        totalInactivityTime: [],
        totalTransactions: [],
        usageFrequency: [],
        labels: [],
    });

    const [timeRangeResponseTime, setTimeRangeResponseTime] = useState('week'); // default time range for response time
    const [timeRangeTotalMessages, setTimeRangeTotalMessages] = useState('week'); // default time range for total messages
    const [timeRangeInactivityTime, setTimeRangeInactivityTime] = useState('week'); // default time range for inactivity time
    const [timeRangeUsageFrequency, setTimeRangeUsageFrequency] = useState('week'); // default time range for usage frequency
    const [timeRangeTotalTransactions, setTimeRangeTotalTransactions] = useState('week'); // default time range for transactions

    const _getConversations = useCallback(
        async (range, setter) => {
            axios('/api/conversation')
                .then((response) => {
                    const conversations = response.data._conversations;

                    // Filter conversations by time range
                    const filteredConversations = filterByTimeRange(conversations, range);

                    const labels = filteredConversations.map(conv => moment(conv.createdAt).format('YYYY-MM-DD'));
                    const avgResponseTime = filteredConversations.map(conv => conv.avgResponseTime);
                    const totalMessages = filteredConversations.map(conv => conv.totalMessages);
                    const totalInactivityTime = filteredConversations.map(conv => conv.totalInactivityTime);
                    const totalTransactions = filteredConversations.map(conv => conv.totalTransactions);
                    const usageFrequency = calculateUsageFrequency(filteredConversations);

                    setter({
                        labels,
                        avgResponseTime,
                        totalMessages,
                        totalInactivityTime,
                        totalTransactions,
                        usageFrequency,
                    });
                })
                .catch((error) => {
                    console.log(error);
                });
        },
        []
    );

    useEffect(() => {
        _getConversations(timeRangeResponseTime, setData);
    }, [timeRangeResponseTime]);

    useEffect(() => {
        _getConversations(timeRangeTotalMessages, setData);
    }, [timeRangeTotalMessages]);

    useEffect(() => {
        _getConversations(timeRangeInactivityTime, setData);
    }, [timeRangeInactivityTime]);

    useEffect(() => {
        _getConversations(timeRangeUsageFrequency, setData);
    }, [timeRangeUsageFrequency]);

    useEffect(() => {
        _getConversations(timeRangeTotalTransactions, setData);
    }, [timeRangeTotalTransactions]);

    const filterByTimeRange = (conversations, range) => {
        const now = moment();
        let filtered;

        switch (range) {
            case 'hour':
                filtered = conversations.filter(conv => moment(conv.createdAt).isAfter(now.subtract(1, 'hours')));
                break;
            case 'day':
                filtered = conversations.filter(conv => moment(conv.createdAt).isAfter(now.subtract(1, 'days')));
                break;
            case 'week':
                filtered = conversations.filter(conv => moment(conv.createdAt).isAfter(now.subtract(1, 'weeks')));
                break;
            case 'month':
                filtered = conversations.filter(conv => moment(conv.createdAt).isAfter(now.subtract(1, 'months')));
                break;
            case 'year':
                filtered = conversations.filter(conv => moment(conv.createdAt).isAfter(now.subtract(1, 'years')));
                break;
            default:
                filtered = conversations;
                break;
        }

        return filtered;
    };

    const calculateUsageFrequency = (conversations) => {
        const frequency = _.countBy(conversations, conv => moment(conv.createdAt).format('YYYY-MM-DD'));
        return Object.values(frequency);
    };

    // Define chart data
    const responseTimeData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Temps de réponse moyen',
                data: data.avgResponseTime,
                fill: false,
                borderColor: 'rgba(75,192,192,1)',
                tension: 0.1,
            },
        ],
    };

    const totalMessagesData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Nombre total de messages',
                data: data.totalMessages,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
            },
        ],
    };

    const totalInactivityTimeData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Temps total d\'inactivité',
                data: data.totalInactivityTime,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
        ],
    };

    const usageFrequencyData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Fréquence d\'utilisation',
                data: data.usageFrequency,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
            },
        ],
    };

    const totalTransactionsData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Total des interaction',
                data: data.totalTransactions,
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
            },
        ],
    };

    return (
        <div className='_pane _dashboard d-flex flex-column'>
            <Card className='rounded-0 h-100'>
                <Card.Body className='h-100 border border-0 rounded-0 no-shadow d-flex flex-column'>
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
                    <div className='_body'>
                        <SimpleBar style={{ maxHeight: '100%' }} forceVisible='y' autoHide={false}>
                            <Container className='grid p-0'>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Average Response Time Chart */}
                                        <p className='text-muted m-0'>Average Response Time</p>
                                        <Dropdown className='border border-1'>
                                            <Dropdown.Toggle className='border border-1'>
                                                <span className='d-flex align-items-center justify-content-center'>
                                                    Sélectionner
                                                </span>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => setTimeRangeResponseTime('hour')}>Last Hour</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeResponseTime('day')}>Last Day</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeResponseTime('week')}>Last Week</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeResponseTime('month')}>Last Month</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeResponseTime('year')}>Last Year</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Line data={responseTimeData} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Messages Chart */}
                                        <p className='text-muted m-0'>Total Messages</p>
                                        <Dropdown className='border border-1'>
                                            <Dropdown.Toggle className='border border-1'>
                                                <span className='d-flex align-items-center justify-content-center'>
                                                    Sélectionner
                                                </span>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalMessages('hour')}>Last Hour</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalMessages('day')}>Last Day</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalMessages('week')}>Last Week</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalMessages('month')}>Last Month</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalMessages('year')}>Last Year</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Line data={totalMessagesData} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Inactivity Time Chart */}
                                        <p className='text-muted m-0'>Total Inactivity Time</p>
                                        <Dropdown className='border border-1'>
                                            <Dropdown.Toggle className='border border-1'>
                                                <span className='d-flex align-items-center justify-content-center'>
                                                    Sélectionner
                                                </span>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => setTimeRangeInactivityTime('hour')}>Last Hour</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeInactivityTime('day')}>Last Day</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeInactivityTime('week')}>Last Week</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeInactivityTime('month')}>Last Month</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeInactivityTime('year')}>Last Year</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Line data={totalInactivityTimeData} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Usage Frequency Chart */}
                                        <p className='text-muted m-0'>Usage Frequency</p>
                                        <Dropdown className='border border-1'>
                                            <Dropdown.Toggle className='border border-1'>
                                                <span className='d-flex align-items-center justify-content-center'>
                                                    Sélectionner
                                                </span>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => setTimeRangeUsageFrequency('hour')}>Last Hour</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeUsageFrequency('day')}>Last Day</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeUsageFrequency('week')}>Last Week</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeUsageFrequency('month')}>Last Month</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeUsageFrequency('year')}>Last Year</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Line data={usageFrequencyData} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Transactions Chart */}
                                        <p className='text-muted m-0'>Total Transactions</p>
                                        <Dropdown className='border border-1'>
                                            <Dropdown.Toggle className='border border-1'>
                                                <span className='d-flex align-items-center justify-content-center'>
                                                    Sélectionner
                                                </span>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalTransactions('hour')}>Last Hour</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalTransactions('day')}>Last Day</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalTransactions('week')}>Last Week</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalTransactions('month')}>Last Month</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setTimeRangeTotalTransactions('year')}>Last Year</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        <Line data={totalTransactionsData} />
                                    </Card.Body>
                                </Card>
                            </Container>
                        </SimpleBar>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}

export default PDashboard;