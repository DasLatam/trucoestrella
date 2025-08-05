// src/components/PublicChat.js
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../App';

export function PublicChat() {
    const { chatMessages, user, socket } = useAppContext();
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            socket.emit('send-public-message', {
                sender: user.name,
                text: newMessage.trim(),
                color: '#A78BFA',
            });
            setNewMessage('');
        }
    };

    return (
        <div className="bg-light-bg p-4 rounded-lg shadow-lg border border-light-border h-[80vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-3">Chat Público</h2>
            <div className="flex-grow space-y-3 p-2 overflow-y-auto">
                {chatMessages.map(msg => (
                    <div key={msg.id} className="text-sm">
                        {msg.type === 'log' ? (
                            <p className="text-green-400 italic opacity-80">» {msg.text}</p>
                        ) : (
                            <div>
                                <span style={{color: msg.color}} className="font-bold">{msg.sender}:</span>
                                <span className="text-gray-200 ml-2 break-words">{msg.text}</span>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="mt-4 flex border-t border-gray-700 pt-4">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-grow bg-gray-800 p-3 rounded-l-md focus:outline-none focus:ring-2 focus:ring-truco-brown text-white"
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit" className="bg-truco-brown text-white font-bold px-5 rounded-r-md hover:bg-opacity-90 transition-all">Enviar</button>
            </form>
        </div>
    );
}