'use client';

import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';

interface HeartbeatManagerProps {
    intervalSeconds?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const HeartbeatManager: React.FC<HeartbeatManagerProps> = ({ intervalSeconds = 60 }) => {
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

    useEffect(() => {
        if (!accessToken || !isAuthenticated) return;

        const sendHeartbeat = async () => {
            try {
                await fetch(`${API_URL}/auth/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        };

        // Send initial heartbeat
        sendHeartbeat();

        // Set up interval
        const intervalId = setInterval(sendHeartbeat, intervalSeconds * 1000);

        return () => clearInterval(intervalId);
    }, [accessToken, isAuthenticated, intervalSeconds]);

    return null; // This component renders nothing
};
