import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use("/client", express.static(path.join(__dirname, "..", "client")))
app.get("/", (req, res) => {
  const file = path.join(__dirname, "..", "client", "index.html")
  res.sendFile(file)
})
const server = http.createServer(app)
const wss = new WebSocketServer({ server: server, path: "/ws" })

function broadcast(data, exceptSocket) {
  const msgStr = JSON.stringify(data)
  wss.clients.forEach((cli) => {
    if (cli.readyState === 1 && cli !== exceptSocket) {
      try {
        cli.send(msgStr)
      } catch (err) {
        console.error("broadcast err", err)
      }
    }
  })
}

wss.on("connection", (socket) => {
  console.log("new client connected")
  socket.send(JSON.stringify({ type: "hello", text: "connected" }))
  socket.on("message", (raw) => {
    let data
    try {
      data = JSON.parse(raw.toString())
    } catch (e) {
      console.log("bad json", e)
      return
    }

    if (data.type === "ops" && Array.isArray(data.ops)) {
      const safeOps = data.ops.slice(0, 60)
      broadcast({ type: "ops", ops: safeOps })
    } else {
      console.log("unknown msg", data)
    }
  })
  socket.on("close", () => {
    console.log("client disconnected")
  })
})

const PORT = process.env.PORT||8080
server.listen(PORT, () => {
  console.log("Server started on http://localhost:" + PORT)
})
