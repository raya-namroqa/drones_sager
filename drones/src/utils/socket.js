import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:9013";

const socket = io(URL, { transports: ["polling"] });

export default socket;
