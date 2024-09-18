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
    moment.locale('fr');

    // Separate states for each chart
    const [responseTimeData, setResponseTimeData] = useState({ labels: [], avgResponseTime: [] });
    const [totalMessagesData, setTotalMessagesData] = useState({ labels: [], totalMessages: [] });
    const [inactivityTimeData, setInactivityTimeData] = useState({ labels: [], totalInactivityTime: [] });
    const [usageFrequencyData, setUsageFrequencyData] = useState({ labels: [], usageFrequency: [] });
    const [totalTransactionsData, setTotalTransactionsData] = useState({ labels: [], totalTransactions: [] });

    // State for dropdowns (time range per chart)
    const [timeRangeResponseTime, setTimeRangeResponseTime] = useState('today');
    const [timeRangeTotalMessages, setTimeRangeTotalMessages] = useState('today');
    const [timeRangeInactivityTime, setTimeRangeInactivityTime] = useState('today');
    const [timeRangeUsageFrequency, setTimeRangeUsageFrequency] = useState('today');
    const [timeRangeTotalTransactions, setTimeRangeTotalTransactions] = useState('today');

    // Time range labels in French
    const timeRangeLabels = {
        hour: "Dernière heure",
        today: "Aujourd'hui",
        day: "Dernier jour",
        week: "Dernière semaine",
        month: "Dernier mois",
        year: "Dernière année"
    };

    // Function to fetch and filter data by time range
    const _getConversations = useCallback(async (range, setter) => {
        axios('/api/conversation')
            .then((response) => {
                const conversations = response.data._conversations;
                const filteredConversations = filterByTimeRange(conversations, range);
                const labels = filteredConversations.map(conv =>
                    moment(conv.updatedAt).format('MMM Do YY, h:mm a')
                );

                // Handle different data sets based on the setter
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
    }, [timeRangeResponseTime, _getConversations]);

    useEffect(() => {
        _getConversations(timeRangeTotalMessages, setTotalMessagesData);
    }, [timeRangeTotalMessages, _getConversations]);

    useEffect(() => {
        _getConversations(timeRangeInactivityTime, setInactivityTimeData);
    }, [timeRangeInactivityTime, _getConversations]);

    useEffect(() => {
        _getConversations(timeRangeUsageFrequency, setUsageFrequencyData);
    }, [timeRangeUsageFrequency, _getConversations]);

    useEffect(() => {
        _getConversations(timeRangeTotalTransactions, setTotalTransactionsData);
    }, [timeRangeTotalTransactions, _getConversations]);

    // Helper to filter data based on the selected time range
    const filterByTimeRange = (conversations, range) => {
        const now = moment();
        let filtered;
        switch (range) {
            case 'hour':
                // Ensure filtering works for the last hour
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isAfter(now.subtract(1, 'hours'))
                );
                break;
            case 'today':
                // Filter for conversations that happened today (from midnight to now)
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isSame(now, 'day')
                );
                break;
            case 'day':
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isAfter(now.subtract(1, 'days'))
                );
                break;
            case 'week':
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isAfter(now.subtract(1, 'weeks'))
                );
                break;
            case 'month':
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isAfter(now.subtract(1, 'months'))
                );
                break;
            case 'year':
                filtered = conversations.filter(conv =>
                    moment(conv.updatedAt).isAfter(now.subtract(1, 'years'))
                );
                break;
            default:
                filtered = conversations;
                break;
        }
        return filtered;
    };

    const calculateUsageFrequency = (conversations) => {
        const frequency = _.countBy(conversations, conv => moment(conv.updatedAt).format('YYYY-MM-DD'));
        return Object.values(frequency);
    };

    // Dropdown component to select time range
    const renderDropdown = (currentRange, setRange) => (
        <Dropdown className='border border-1'>
            <Dropdown.Toggle className='border border-1'>
                <span>{timeRangeLabels[currentRange]}</span> {/* Display the label in French */}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item onClick={() => setRange('hour')}>{timeRangeLabels['hour']}</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('today')}>{timeRangeLabels['today']}</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('day')}>{timeRangeLabels['day']}</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('week')}>{timeRangeLabels['week']}</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('month')}>{timeRangeLabels['month']}</Dropdown.Item>
                <Dropdown.Item onClick={() => setRange('year')}>{timeRangeLabels['year']}</Dropdown.Item>
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
                                        <p className='text-muted m-0'>Temps de réponse moyen</p>
                                        {renderDropdown(timeRangeResponseTime, setTimeRangeResponseTime)}
                                        <Line data={{
                                            labels: responseTimeData.labels,
                                            datasets: [{
                                                label: 'Temps de réponse moyen',
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
                                        <p className='text-muted m-0'>Total des messages</p>
                                        {renderDropdown(timeRangeTotalMessages, setTimeRangeTotalMessages)}
                                        <Line data={{
                                            labels: totalMessagesData.labels,
                                            datasets: [{
                                                label: 'Total des messages',
                                                data: totalMessagesData.totalMessages,
                                                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Inactivity Time Chart */}
                                        <p className='text-muted m-0'>Temps d'inactivité total</p>
                                        {renderDropdown(timeRangeInactivityTime, setTimeRangeInactivityTime)}
                                        <Line data={{
                                            labels: inactivityTimeData.labels,
                                            datasets: [{
                                                label: 'Temps d\'inactivité total',
                                                data: inactivityTimeData.totalInactivityTime,
                                                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Usage Frequency Chart */}
                                        <p className='text-muted m-0'>Fréquence d'utilisation</p>
                                        {renderDropdown(timeRangeUsageFrequency, setTimeRangeUsageFrequency)}
                                        <Line data={{
                                            labels: usageFrequencyData.labels,
                                            datasets: [{
                                                label: 'Fréquence d\'utilisation',
                                                data: usageFrequencyData.usageFrequency,
                                                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                                            }]
                                        }} />
                                    </Card.Body>
                                </Card>
                                <Card className='g-col-6'>
                                    <Card.Body className='border border-0 no-shadow'>
                                        {/* Total Transactions Chart */}
                                        <p className='text-muted m-0'>Total des interactions</p>
                                        {renderDropdown(timeRangeTotalTransactions, setTimeRangeTotalTransactions)}
                                        <Line data={{
                                            labels: totalTransactionsData.labels,
                                            datasets: [{
                                                label: 'Total des interactions',
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