import { initCanvas } from "./canvas.js"
import { initNetworking } from "./websocket.js"

const canvas = document.getElementById("canvas")
const toolSel = document.getElementById("tool")
const colorInp = document.getElementById("color")
const sizeInp = document.getElementById("size")

const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
function fixCanvasSize() {
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
new ResizeObserver(fixCanvasSize).observe(canvas)
fixCanvasSize()

const engine = initCanvas()
engine.setTool(toolSel.value)
engine.setColor(colorInp.value)
engine.setSize(parseInt(sizeInp.value || 6))

toolSel.addEventListener("change", () => engine.setTool(toolSel.value))
colorInp.addEventListener("change", () => engine.setColor(colorInp.value))
sizeInp.addEventListener("input", () => {
  const val = parseInt(sizeInp.value)
  engine.setSize(val)
})

const net = initNetworking({
  onServerOps: (ops) => {
    engine.applyRemoteOps(ops)
  }
})
engine.onLocalOps((ops) => {
  net.sendOps(ops)
})
console.log("main.js ready")
