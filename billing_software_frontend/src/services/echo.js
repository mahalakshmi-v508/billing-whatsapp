import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

let echo = null;

export function getEcho() {
  if (echo) return echo;

  echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY || "local-app-key",
    wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    forceTLS: false,
    enabledTransports: ["ws", "wss"],
  });

  return echo;
}

export function leaveChannel(channel) {
  if (echo) {
    echo.leave(channel);
  }
}
