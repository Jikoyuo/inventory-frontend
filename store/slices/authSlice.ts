import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
    roleCode?: string;
}

interface AuthState {
    accessToken: string | null;
    privileges: string[];
    user: User | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    accessToken: null,
    privileges: [],
    user: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{
                token: string;
                privileges: string[];
                user: User;
            }>
        ) => {
            state.accessToken = action.payload.token;
            state.privileges = action.payload.privileges;
            state.user = action.payload.user;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.accessToken = null;
            state.privileges = [];
            state.user = null;
            state.isAuthenticated = false;
        },
        updateToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
    },
});

export const { setCredentials, logout, updateToken } = authSlice.actions;
export default authSlice.reducer;
