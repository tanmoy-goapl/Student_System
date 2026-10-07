'use client';

import { useEffect, useState } from 'react';

export default function Greeting() {
    const [username, setUsername] = useState("User");

    useEffect(() => {
        const storedName = localStorage.getItem("user_name");
        if (storedName) {
            setUsername(storedName);
        }
    }, []);

    return (
        <div className="py-2">
            <h3 className="text-3xl font-bold">Hi {username}! 👋</h3>
            <p>Here's your AI-powered study command center for today.</p>
        </div>
    );
}