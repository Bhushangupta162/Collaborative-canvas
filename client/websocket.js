export function initNetworking({ onServerOps }) {
  let socket;
  let pendingOps = [];  
  let flushTimer = null;

  function connect() {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${proto}://${window.location.host}/ws`);
    socket.addEventListener("open", () => {
      console.log("ws open");
      flush(true);
    });

    socket.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.warn("bad json from server", err);
        return;
      }
      if (msg.type === "ops" && Array.isArray(msg.ops)) {
        onServerOps(msg.ops);
      } else {
    }
    });

    socket.addEventListener("close", () => {
      console.warn("ws closed, retrying...");
      setTimeout(connect, 1000);
    });
  }

  function sendOps(ops) {
    if (!Array.isArray(ops)) return;
    pendingOps.push(...ops);
    planFlush();
  }

  function planFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => flush(false), 15);
  }

  function flush(force) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if (force) return;
      return;
    }
    if (!pendingOps.length) {
      clearTimeout(flushTimer);
      flushTimer = null;
      return;
    }

    const opsChunk = pendingOps.splice(0, 60);
    try {
      socket.send(JSON.stringify({ type: "ops", ops: opsChunk }));
    } catch (e) {
      console.error("send failed", e);
    }
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  connect();
  return { sendOps };
}
