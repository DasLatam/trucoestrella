// /components/PublicChat.js
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
                color: '#A78BFA', // Un color de ejemplo para el usuario
            });
            setNewMessage('');
        }
    };

    return (
        <div className="bg-[#000000] bg-opacity-30 p-4 rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">Chat Público</h2>
            <div className="flex-grow space-y-3 pr-2 overflow-y-auto">
                {chatMessages.map(msg => (
                    <div key={msg.id}>
                        {msg.type === 'log' ? (
                            <p className="text-sm text-green-400 italic">» {msg.text}</p>
                        ) : (
                            <p><span style={{color: msg.color}} className="font-bold">{msg.sender}:</span> {msg.text}</p>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="mt-4 flex">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-grow bg-gray-700 p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#C87941]"
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit" className="bg-[#C87941] text-gray-900 font-bold px-4 rounded-r-md">Enviar</button>
            </form>
        </div>
    );
}
