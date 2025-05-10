import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';

const ChatApp = () => {
    //State-variabler
    const [connection, setConnection] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [announcementMessages, setAnnouncementMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState('');
    const [role, setRole] = useState('Student');
    const [pinnedIndex, setPinnedIndex] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Set());


    //Upprätta ny SignalR-anslutning
    useEffect(() => {
        const newConnection = new HubConnectionBuilder()
            .withUrl('http://localhost:5000/chatHub')
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);
    }, []);

    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    console.log('Connected to SignalR Hub');

                    // Ta emot meddelanden, nytt objekt läggs till i listan
                    connection.on('ReceiveMessage', (user, message, role) => {
                        setChatMessages(prev => [...prev, { user, message, role }]);
                    });

                    // Ta emot viktiga meddelanden, nytt objekt läggs till i listan
                    connection.on('ReceiveAnnouncement', (user, message, role) => {
                        setAnnouncementMessages(prev => [...prev, { user, message, role }]);
                    });

                    // När ett meddelande raderas, raderas vid indexet
                    connection.on('MessageDeleted', (index) => {
                        setChatMessages(prev => prev.filter((_, i) => i !== index));
                    });

                    // När ett meddelande redigeras, nytt objekt vid indexet
                    connection.on('MessageEdited', (index, newContent) => {
                        setChatMessages(prev => prev.map((msg, i) =>
                            i === index ? { ...msg, message: newContent } : msg
                        ));
                    });

                    // När ett meddelande pinnas, sätter state-variabel med indexet
                    connection.on('MessagePinned', (index) => {
                        setPinnedIndex(index);
                    });

                    // När någon börjar skriva, ett Set uppdateras med användaren
                    connection.on('TypingStarted', (typingUser) => {
                        setTypingUsers(prev => new Set(prev).add(typingUser));
                    });

                    // När någon slutar skriva, ett set uppdateras med att ta bort användaren
                    connection.on('TypingEnded', (typingUser) => {
                        setTypingUsers(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(typingUser);
                            return newSet;
                        });
                    });
                })
                .catch(err => console.error('Connection failed: ', err));

            // Rensa event-lyssnare när komponenten unmountas eller connection ändras
            return () => {
                connection.off('ReceiveMessage');
                connection.off('ReceiveAnnouncement');
            };
        }
    }, [connection]);

    // Skicka ett vanligt meddelande
    const sendMessage = async () => {
        if (connection && message.trim() !== '') {
            try {
                await connection.invoke('SendMessage', user, message, role);
                setMessage('');
            } catch (error) {
                console.error('Sending failed: ', error);
            }
        }
    };

    // Skicka ett viktigt meddelande (endast lärare)
    const sendAnnouncement = async () => {
        if (connection && message.trim() !== '' && role === 'Teacher') {
            try {
                await connection.invoke('SendAnnouncement', user, message, role);
                setMessage('');
            } catch (error) {
                console.error('Announcement failed: ', error);
            }
        }
    };

    //Vyn
    return (
        <div>
            <h2>Chatt</h2>
            {/* Skriva in namn */}
            <input
                type="text"
                placeholder="Ditt namn"
                value={user}
                onChange={e => setUser(e.target.value)}
            />
            <select value={role} onChange={e => setRole(e.target.value)}>
                {/* Välja roll */}
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
            </select>

            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                {/* Generell chatt */}
                <div style={{ flex: 1 }}>
                    <h3>💬 Generell chatt</h3>
                    <div style={{ height: '200px', overflowY: 'scroll', border: '1px solid black', padding: '8px' }}>
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} style={{ backgroundColor: idx === pinnedIndex ? '#ffffcc' : 'transparent' }}>
                                {/*Visar namn, roll och meddelande*/}
                                <strong>{msg.user} ({msg.role}):</strong> {msg.message}
                                {role === 'Teacher' && (
                                    <span style={{ marginLeft: '10px' }}>
                                        {/* Ta bort meddelande (enbart för lärare) */}
                                        <button onClick={() => connection.invoke('DeleteMessage', idx)}>🗑</button>
                                        {/* Redigera meddelande (enbart för lärare) */}
                                        <button onClick={() => {
                                            const newMsg = prompt('New message:', msg.message);
                                            if (newMsg) {
                                                connection.invoke('EditMessage', idx, newMsg);
                                            }
                                        }}>✏️</button>
                                        {/* Pinna meddelande (enbart för lärare) */}
                                        <button onClick={() => connection.invoke('PinMessage', idx)}>📌</button>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Indikator på att någon skriver*/}
                    {Array.from(typingUsers).map((typingUser, idx) => (
                        <div key={idx} style={{ fontStyle: 'italic', fontSize: '0.9em', color: 'gray' }}>
                            {typingUser} skriver...
                        </div>
                    ))}
                </div>

                {/* Viktiga meddelanden/announcements */}
                <div style={{ flex: 1 }}>
                    <h3>📢 Viktiga meddelanden</h3>
                    <div style={{ height: '200px', overflowY: 'scroll', border: '1px solid darkorange', padding: '8px', backgroundColor: '#fffbe6' }}>
                        {announcementMessages.map((msg, idx) => (
                            <div key={idx}>
                                {/*Visar namn, roll och meddelande*/}
                                <strong>{msg.user} ({msg.role}):</strong> {msg.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Input-fält och buttons */}
            <div style={{ marginTop: '10px' }}>
                {/*Skriva meddelandet*/}
                {/*OnChange={} Triggar indikatorn för skrift, slutar visas om man inte skriver på 2 sekunder*/}
                {/*OnKeyDown={} Skickar meddelandet med key enter*/}
                <input
                    type="text"
                    placeholder="Skriv ett meddelande"
                    value={message}
                    onChange={e => {
                        setMessage(e.target.value);
                        if (connection && user) {
                            connection.invoke('Typing', user);
                            clearTimeout(window.typingTimeout);
                            window.typingTimeout = setTimeout(() => {
                                connection.invoke('StopTyping', user);
                            }, 2000);
                        }
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
                {/*Skickar meddelandet med knapp*/}
                <button onClick={sendMessage}>Skicka till chatten</button>
                {/*Skickar viktigt meddelande med knapp om man är lärare*/}
                {role === 'Teacher' && (
                    <button onClick={sendAnnouncement} style={{ marginLeft: '10px' }}>
                        Skicka viktigt meddelande
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatApp;
