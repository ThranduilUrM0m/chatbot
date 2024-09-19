import React, { useCallback, useEffect, useState } from 'react';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Toast from 'react-bootstrap/Toast';
import _useStore from "../../store";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import moment from 'moment';
import _ from 'lodash';
import axios from "axios";
import { io } from 'socket.io-client';
import { faClock, faPaperPlane, faPenToSquare, faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production') ? window.location.hostname : 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const usePersistentFingerprint = (setIsFingerprintLoaded) => {
    const [_fingerprint, setFingerprint] = useState('');

    useEffect(() => {
        const generateFingerprint = async () => {
            // Check if the persistent identifier exists in storage (e.g., cookie or local storage)
            const persistentIdentifier = localStorage.getItem('persistentIdentifier');

            if (persistentIdentifier) {
                // Use the persistent identifier if available
                setFingerprint(persistentIdentifier);
                setIsFingerprintLoaded(true); // Notify that fingerprint is loaded
            } else {
                // Fallback to generating a new fingerprint using FingerprintJS
                const fp = await FingerprintJS.load();
                const { visitorId } = await fp.get();
                setFingerprint(visitorId);

                // Store the persistent identifier for future visits
                localStorage.setItem('persistentIdentifier', visitorId);
                setIsFingerprintLoaded(true); // Notify that fingerprint is loaded
            }
        };

        generateFingerprint();
    }, [setIsFingerprintLoaded]);

    return _fingerprint;
};

/* JOY : localStorage should always check with the database, cause sometimes it has what was deleted from the database manually */
const Home = (props) => {
    moment.locale('fr');

    const _conversations = _useStore.useConversationStore((state) => state._conversations);
    const setConversations = _useStore.useConversationStore((state) => state["_conversations_SET_STATE"]);

    const _validationSchema = Yup
        .object()
        .shape({
            _message: Yup.string()
                .default('')
        });

    const {
        register,
        watch,
        reset,
        trigger,
        formState: { errors }
    } = useForm({
        mode: 'onChange',
        reValidateMode: 'onSubmit',
        resolver: yupResolver(_validationSchema),
        defaultValues: {
            _message: ''
        }
    });

    /* Focus State Variables */
    const [_messageFocused, setMessageFocused] = useState(false);

    /* Chat State Variables */
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [_idConversation, setIdConversation] = useState(null);

    const [isFingerprintLoaded, setIsFingerprintLoaded] = useState(false);
    const _fingerprint = usePersistentFingerprint(setIsFingerprintLoaded);

    /* Handle Creating a new conversation */
    const _startNewConversation = (newConversation = false) => {
        /* Illelagl to retrieve IP Adresse */
        if (isFingerprintLoaded) {
            setIsLoading(true);
            _socket.emit('_newConversation', {
                _conversation_user: _fingerprint,
                newConversation, // Pass the argument to the server
                language: 'fr',
            }, (response) => {
                if (response.error) {
                    console.error('Error:', response.error);
                    return;
                }
                const { conversationId, chatHistory } = response; // Now receive the conversation ID and chat history from the backend

                if (conversationId) {
                    setIdConversation(conversationId);
                    localStorage.setItem('_idConversation', conversationId);
                    localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); // Save the chat history in local storage
                    setChatHistory(chatHistory); // Update local chat history
                    _getConversations();
                } else {
                    console.error('Conversation ID is null or undefined');
                }
            });
        } else {
            console.log('Fingerprint not loaded yet. Please wait.');
        }
    };

    /* Handle Form Submission */
    const _handleSendMessage = () => {
        const messageContent = watch('_message');

        if (_.trim(messageContent)) {
            setIsLoading(true);
            const conversationId = localStorage.getItem('_idConversation'); // Retrieve conversation ID
            _socket.emit('_sendMessage', {
                user: _fingerprint, // Use fingerprint here
                conversationId, // Pass conversation ID
                chatHistory: chatHistory,
                role: 'user',
                content: messageContent,
            });
            _getConversations();

            // Clear input
            reset();
        }
    };

    /* Handle Deletion */
    const _deleteConversation = (conversationId) => {
        if (!conversationId) return;

        axios.delete(`/api/conversation/${conversationId}`)
            .then((response) => {
                if (response.data.success) {
                    if (_idConversation === conversationId) {
                        setIdConversation(null);
                        setChatHistory([]);
                        localStorage.removeItem('_idConversation');
                        localStorage.removeItem('chatHistory');

                        /* Create new Conversation */
                        _startNewConversation(true);
                    }

                    // Re-fetch conversations after deletion
                    _getConversations();
                } else {
                    console.error('Failed to delete conversation:', response.data.error);
                }
            })
            .catch((error) => {
                console.error('Error deleting conversation:', error);
            });
    };

    const _getConversations = useCallback(async () => {
        axios("/api/conversation")
            .then((response) => {
                let __convos = _.filter(response.data._conversations, conversation => conversation._conversation_user === _fingerprint)
                setConversations(__convos);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [setConversations, _fingerprint]);

    useEffect(() => {
        if (isFingerprintLoaded) {
            _getConversations();
        }

        const savedChatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        const savedConversationId = localStorage.getItem('_idConversation');

        if (savedConversationId) {
            // Use the existing conversation from localStorage
            setChatHistory(savedChatHistory);
            setIdConversation(savedConversationId);
        } else {
            // Start a new conversation only if fingerprint is loaded
            if (isFingerprintLoaded) {
                _startNewConversation(true);
            }
        }

        _socket.on('newConversation', (message) => {
            setChatHistory((prevChatHistory) => {
                const updatedChatHistory = [...prevChatHistory, ...message.chatHistory]; // Spread existing history
                localStorage.setItem('chatHistory', JSON.stringify(updatedChatHistory)); // Save updated history
                return updatedChatHistory;
            });
            setIdConversation(message.conversationId); // Save the conversation ID
            localStorage.setItem('_idConversation', message.conversationId); // Update in localStorage
            setIsLoading(false);
        });

        // Listen for messages from the server
        _socket.on('messageSent', (message) => {
            setChatHistory((prevChatHistory) => {
                const updatedChatHistory = [...prevChatHistory, message];
                localStorage.setItem('chatHistory', JSON.stringify(updatedChatHistory)); // Update localStorage
                return updatedChatHistory;
            });
        });

        return () => {
            _socket.off('newConversation');
            _socket.off('messageSent');
        };
    }, [isFingerprintLoaded, _getConversations]);

    const groupedConversations = _.groupBy(_conversations, (conversation) => {
        const updatedAt = moment(conversation.updatedAt);
        const now = moment();

        if (updatedAt.isAfter(now.subtract(1, 'hour'))) {
            return 'lastHour';
        } else if (updatedAt.isSame(now, 'day')) {
            return 'today';
        } else if (updatedAt.isSame(now.subtract(1, 'day'), 'day')) {
            return 'yesterday';
        } else if (updatedAt.isSame(now, 'week')) {
            return 'lastWeek';
        } else if (updatedAt.isSame(now, 'month')) {
            return 'lastMonth';
        } else if (updatedAt.isSame(now, 'year')) {
            return 'lastYear';
        } else {
            return 'beforeLastYear';
        }
    });

    const groupNames = {
        lastHour: 'Dernière heure',
        today: 'Aujourd\'hui',
        yesterday: 'Hier',
        lastWeek: 'La semaine dernière',
        lastMonth: 'Le mois dernier',
        lastYear: 'L\'année dernière',
        beforeLastYear: 'Avant l\'année dernière',
    };

    return (
        <main className='_home'>
            <section className='_s1 d-flex flex-column'>
                <div className='_lines'>
                    <div className='d-flex flex-column justify-content-center'>
                        <img className='img-fluid' src='https://cdg.ma/themes/cdg/logo.svg' alt='HelpAI CDG' />
                        <blockquote className="blockquote mb-0 d-flex flex-column align-items-center">
                            <p className='h4 text-muted m-0 fw-semibold'>Bonjour & Bienvenue sur HelpAI</p>
                            <p className='h4 m-0 mb-3 fw-semibold'>Puis-je vous aider avec quoi que ce soit ?</p>
                            <p className='m-0 text-center'>Prêt à vous aider avec tout ce dont vous avez besoin, de répondre<br />des questions aux recommandations. Commençons !</p>
                        </blockquote>
                    </div>
                </div>
                <div className='_lines w-50 h-100 mx-auto flex-grow-1 d-flex flex-column justify-content-end'>
                    <div className='_discussion'>
                        {_.map(chatHistory, (message, index) => (
                            <p key={index} className={message.role === 'user' ? 'user-message' : 'ai-message'}>
                                <strong>{message.role === 'user' ? 'You:' : 'HelpAI:'}</strong> {message.content}
                            </p>
                        ))}
                    </div>
                    <Form className='d-flex flex-column'>
                        <Form.Group
                            controlId='_message'
                            className={`_formGroup ${_messageFocused ? 'focused' : ''}`}
                        >
                            <FloatingLabel
                                label='Ask HelpAI for anything.'
                                className='_formLabel'
                            >
                                <Form.Control
                                    {...register('_message')}
                                    onBlur={() => {
                                        setMessageFocused(false);
                                        trigger('_message');
                                    }}
                                    onFocus={() => setMessageFocused(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            _handleSendMessage();
                                        }
                                    }}
                                    placeholder='Ask HelpAI for anything.'
                                    autoComplete='new-password'
                                    type='text'
                                    className={`_formControl border rounded-0 ${errors._message ? 'border-danger' : ''}`}
                                    name='_message'
                                />
                            </FloatingLabel>
                        </Form.Group>
                        <Button
                            type='button'
                            className='border border-0 rounded-0 inverse p-0'
                            onClick={() => _handleSendMessage()}
                            disabled={_.isEmpty(_.trim(watch('_message'))) || isLoading}
                        >
                            <span>
                                <FontAwesomeIcon icon={faPaperPlane} />
                            </span>
                        </Button>
                        <Button
                            type='button'
                            className='border border-0 rounded-0 inverse'
                            variant='outline-light'
                            onClick={() => _startNewConversation(true)}
                        >
                            <div className='buttonBorders'>
                                <div className='borderTop'></div>
                                <div className='borderRight'></div>
                                <div className='borderBottom'></div>
                                <div className='borderLeft'></div>
                            </div>
                            <span>
                                <FontAwesomeIcon icon={faPenToSquare} />
                            </span>
                        </Button>
                    </Form>
                </div>
                <Toast>
                    <Toast.Header closeButton={false}>
                        <p className='h5 text-muted m-0 fw-semibold'>Vos conversations</p>
                    </Toast.Header>
                    <Toast.Body>
                        <SimpleBar style={{ maxHeight: '100%' }} forceVisible='y' autoHide={false}>
                            {_.isEmpty(_conversations) ? (
                                <p className='h6 text-muted text-center m-0 fw-semibold'>Vous n'avez pas d'autres conversation pour le moment</p>
                            ) : (
                                // Define the desired order for the groups
                                ['lastHour', 'today', 'yesterday', 'lastWeek', 'lastMonth', 'lastYear', 'beforeLastYear'].map((key) => {
                                    const conversations = groupedConversations[key];

                                    if (!conversations) return null; // Skip if no conversations in this group

                                    return (
                                        <div className='conversationGroup' key={key}>
                                            <p className='m-0 __groupName'>{groupNames[key]}</p>
                                            {_.map(conversations, (conversation, index) => (
                                                <div
                                                    key={index}
                                                    className={`d-flex conversationItem ${conversation._id === _idConversation ? '__currentConversation' : ''}`}
                                                >
                                                    <span
                                                        onClick={() => {
                                                            setIdConversation(conversation._id);
                                                            setChatHistory(conversation.chatHistory);
                                                            localStorage.setItem('_idConversation', conversation._id);
                                                            localStorage.setItem('chatHistory', JSON.stringify(conversation.chatHistory));
                                                        }}
                                                        className='flex-grow-1'
                                                    >
                                                        <p className='m-0 __conversationName'>
                                                            {conversation.chatHistory.find(message => message.role === 'user')
                                                                ? conversation.chatHistory.find(message => message.role === 'user').content
                                                                : conversation.chatHistory.length > 0
                                                                    ? conversation.chatHistory[0].content
                                                                    : 'No messages yet.'}
                                                        </p>
                                                        <p className='m-0 text-muted __timeStamp'>
                                                            <FontAwesomeIcon icon={faClock} /> {moment(conversation.updatedAt).fromNow()}
                                                        </p>
                                                    </span>
                                                    <Button
                                                        type='button'
                                                        className='border border-0 rounded-0 red inverse'
                                                        variant='btn-outline-danger'
                                                        onClick={() => _deleteConversation(conversation._id)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrashCan} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })
                            )}
                        </SimpleBar>
                    </Toast.Body>
                </Toast>
            </section>
        </main>
    );
}

export default Home;