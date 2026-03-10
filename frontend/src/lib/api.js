import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://192.168.178.81:5000') + '/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
});

export default api;
export { API_BASE };
