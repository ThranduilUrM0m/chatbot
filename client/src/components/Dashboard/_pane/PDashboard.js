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
    // Separate states for each chart
    const [responseTimeData, setResponseTimeData] = useState({ labels: [], avgResponseTime: [] });
    const [totalMessagesData, setTotalMessagesData] = useState({ labels: [], totalMessages: [] });
    const [inactivityTimeData, setInactivityTimeData] = useState({ labels: [], totalInactivityTime: [] });
    const [usageFrequencyData, setUsageFrequencyData] = useState({ labels: [], usageFrequency: [] });
    const [totalTransactionsData, setTotalTransactionsData] = useState({ labels: [], totalTransactions: [] });

    // State for dropdowns (time range per chart)
    const [timeRangeResponseTime, setTimeRangeResponseTime] = useState('week');
    const [timeRangeTotalMessages, setTimeRangeTotalMessages] = useState('week');
    const [timeRangeInactivityTime, setTimeRangeInactivityTime] = useState('week');
    const [timeRangeUsageFrequency, setTimeRangeUsageFrequency] = useState('week');
    const [timeRangeTotalTransactions, setTimeRangeTotalTransactions] = useState('week');

    // Function to fetch and filter data by time range
    const _getConversations = useCallback(async (range, setter) => {
        axios('/api/conversation')
            .then((response) => {
                const conversations = response.data._conversations;
                const filteredConversations = filterByTimeRange(conversations, range);
                const labels = filteredConversations.map(conv =>
                    moment(conv.createdAt).format('MMM Do YY, h:mm a')
                );

                // Based on setter, we handle different chart data
                if (setter === setResponseTimeData) {
                    const avgResponseTime = filteredConversations.map(conv => conv.avgResponseTime);
                    setter({ labels, avgResponseTime });
                } else if (setter === setTotalMessagesData) {
                    const totalMessages = filteredConversations.map(conv => conv.totalMessages);
                    setter({ labels, totalMessages });
                } else if (setter === setInactivityTimeData) {
                    const totalInactivityTime = filteredConversations.map(conv => conv.totalInactivityTime);
                    setter({ labels, totalInactivityTime });
                } else if (setter === setUsageFrequencyData) {
                    const usageFrequency = calculateUsageFrequency(filteredConversations);
                    setter({ labels, usageFrequency });
                } else if (setter === setTotalTransactionsData) {
                    const totalTransactions = filteredConversations.map(conv => conv.totalTransactions);
                    setter({ labels, totalTransactions });
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

    // Fetching data for each chart based on time range change
    useEffect(() => {
        _getConversations(timeRangeResponseTime, setResponseTimeData);
    }, [timeRangeResponseTime]);

    useEffect(() => {
        _getConversations(timeRangeTotalMessages, setTotalMessagesData);
    }, [timeRangeTotalMessages]);

    useEffect(() => {
        _getConversations(timeRangeInactivityTime, setInactivityTimeData);
    }, [timeRangeInactivityTime]);

    useEffect(() => {
        _getConversations(timeRangeUsageFrequency, setUsageFrequencyData);
    }, [timeRangeUsageFrequency]);

    useEffect(() => {
        _getConversations(timeRangeTotalTransactions, setTotalTransactionsData);
    }, [timeRangeTotalTransactions]);

    // Helper to filter data based on the selected time range
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

    // Dropdown component to select time range
    const renderDropdown = (currentRange, setRange) => (
        <Dropdown className='border border-1'>
            <Dropdown.Toggle className='border border-1'>
                <span>{currentRange.charAt(0).toUpperCase() + currentRange.slice(1)}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item onClick={() => setRange('hour')}>Last Hour</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('day')}>Last Day</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('week')}>Last Week</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('month')}>Last Month</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('year')}>Last Year</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );

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
                                        {renderDropdown(timeRangeResponseTime, setTimeRangeResponseTime)}
                                        <Line data={{
                                            labels: responseTimeData.labels,
                                            datasets: [{
                                                label: 'Average Response Time',
                                                data: responseTimeData.avgResponseTime,
                                                fill: false,
                                                borderColor: 'rgba(75,192,192,1)',
                                                tension: 0.1,
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Messages Chart */}
                                        <p className='text-muted m-0'>Total Messages</p>
                                        {renderDropdown(timeRangeTotalMessages, setTimeRangeTotalMessages)}
                                        <Line data={{
                                            labels: totalMessagesData.labels,
                                            datasets: [{
                                                label: 'Total Messages',
                                                data: totalMessagesData.totalMessages,
                                                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Inactivity Time Chart */}
                                        <p className='text-muted m-0'>Total Inactivity Time</p>
                                        {renderDropdown(timeRangeInactivityTime, setTimeRangeInactivityTime)}
                                        <Line data={{
                                            labels: inactivityTimeData.labels,
                                            datasets: [{
                                                label: 'Total Inactivity Time',
                                                data: inactivityTimeData.totalInactivityTime,
                                                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Usage Frequency Chart */}
                                        <p className='text-muted m-0'>Usage Frequency</p>
                                        {renderDropdown(timeRangeUsageFrequency, setTimeRangeUsageFrequency)}
                                        <Line data={{
                                            labels: usageFrequencyData.labels,
                                            datasets: [{
                                                label: 'Usage Frequency',
                                                data: usageFrequencyData.usageFrequency,
                                                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Transactions Chart */}
                                        <p className='text-muted m-0'>Total Transactions</p>
                                        {renderDropdown(timeRangeTotalTransactions, setTimeRangeTotalTransactions)}
                                        <Line data={{
                                            labels: totalTransactionsData.labels,
                                            datasets: [{
                                                label: 'Total Transactions',
                                                data: totalTransactionsData.totalTransactions,
                                                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                                            }]
                                        }} />
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