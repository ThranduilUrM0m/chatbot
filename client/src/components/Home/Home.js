import React, { useEffect, useState } from 'react';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import _ from 'lodash';
import { io } from 'socket.io-client';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

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

const Home = (props) => {
    /* JOY : Show the history of conversations and be able to delete */
    /* JOY : localStorage should always check with the database, cause sometimes it has what was deleted from the database manually */
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

    const _startNewConversation = () => {
        /* Illelagl to retrieve IP Adresse */
        if (isFingerprintLoaded) {
            setIsLoading(true);
            _socket.emit('_newConversation', { _conversation_user: _fingerprint }, (response) => {
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

            // Clear input
            reset();
        }
    };

    useEffect(() => {
        const savedChatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        const savedConversationId = localStorage.getItem('_idConversation');

        if (savedConversationId) {
            // Use the existing conversation from localStorage
            setChatHistory(savedChatHistory);
            setIdConversation(savedConversationId);
        } else {
            // Start a new conversation only if fingerprint is loaded
            if (isFingerprintLoaded) {
                _startNewConversation();
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
    }, [isFingerprintLoaded]);

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
                            className='border border-0 rounded-0 inverse'
                            variant='outline-light'
                            onClick={() => _handleSendMessage()}
                            disabled={_.trim(watch('_message')) === '' || isLoading}
                        >
                            <div className='buttonBorders'>
                                <div className='borderTop'></div>
                                <div className='borderRight'></div>
                                <div className='borderBottom'></div>
                                <div className='borderLeft'></div>
                            </div>
                            <span>
                                Send Message<b className='pink_dot'>.</b>
                            </span>
                        </Button>
                        <Button
                            type='button'
                            className='border border-0 rounded-0 inverse'
                            variant='outline-light'
                            onClick={() => _startNewConversation()}
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
            </section>
        </main>
    );
}

export default Home;