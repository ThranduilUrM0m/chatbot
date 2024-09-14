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

const _socketURL = _.isEqual(process.env.NODE_ENV, 'production') ? window.location.hostname : 'localhost:5000';
const _socket = io(_socketURL, { 'transports': ['websocket', 'polling'] });

const Home = (props) => {
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

    const _startNewConversation = () => {
        setIsLoading(true);
        // Emit event to server to start a new conversation
        _socket.emit('_newConversation', { _conversation_user: 'Anonymous User' }, (newConversationId) => {
            // Save the new conversation ID and initialize state
            setIdConversation(newConversationId);
            localStorage.setItem('_idConversation', newConversationId);
            localStorage.setItem('chatHistory', JSON.stringify([])); // Initialize with an empty history
            setChatHistory([]);
        });
    };

    /* Handle Form Submission */
    const _handleSendMessage = () => {
        console.log('Message:', watch('_message'));
        if (_.trim(watch('_message'))) {
            console.log('Reached Here:', watch('_message'));
            setIsLoading(true);
            _socket.emit('_messageSent', {
                user: 'Anonymous User', // Replace with actual user info if needed
                chatHistory: chatHistory,
                role: 'user',
                content: watch('_message'),
            });
            reset();
        }
    };

    useEffect(() => {
        const savedChatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        const savedConversationId = localStorage.getItem('_idConversation');

        if (savedChatHistory.length > 0 && savedConversationId) {
            // Use the existing conversation from localStorage
            setChatHistory(savedChatHistory);
            setIdConversation(savedConversationId);
        } else {
            // Start a new conversation
            _startNewConversation();
        }

        _socket.on('_newConversation', (message) => {
            setChatHistory((prevChatHistory) => {
                const updatedChatHistory = [...prevChatHistory, message];
                localStorage.setItem('chatHistory', JSON.stringify(updatedChatHistory)); // Save updated history
                return updatedChatHistory;
            });
            setIsLoading(false);
        });

        // Listen for messages from the server
        _socket.on('_messageSent', (message) => {
            setChatHistory((prevChatHistory) => [...prevChatHistory, message]);
        });

        return () => {
            _socket.off('_newConversation');
            _socket.off('_messageSent');
        };
    }, []);

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
                        {chatHistory.map((message, index) => (
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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