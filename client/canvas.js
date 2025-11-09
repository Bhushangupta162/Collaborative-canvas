export function initCanvas() {
  const canvas = document.getElementById("canvas")
  const ctx = canvas.getContext("2d")
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

  const state = {
    tool: "brush",
    color: "#1f6feb",
    size: 6,
    drawing: false
  }

  const points = []
  const listeners = { localOps: new Set() }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  new ResizeObserver(resizeCanvas).observe(canvas)
  resizeCanvas()

  const dist2 = (a,b) => {
    const dx = a.x - b.x, dy = a.y - b.y
    return dx*dx + dy*dy
  }

  const toPoint = (e) => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() }
  }

  let strokeId = null
  function startDraw(e) {
    if (e.button !== 0) return
    state.drawing = true
    const p = toPoint(e)
    points.length = 0
    points.push(p)

    strokeId = `s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    emit([{ 
      type: "add", 
      op: {
        id: strokeId,
        kind: state.tool === "eraser" ? "erase" : "stroke",
        color: state.color,
        size: state.size,
        points: [p]
      }
    }])
    drawLocal()
  }



  function moveDraw(e) {
    if (!state.drawing) return
    const p = toPoint(e)
    if (!points.length || dist2(points[points.length - 1], p) > 2) {
      points.push(p)
      emit([{ type: "update", id: strokeId, append: [p] }])
      drawLocal()
    }
  }

  function endDraw() {
    if (!state.drawing) return
    state.drawing = false
    if (strokeId) emit([{ type: "commit", id: strokeId }])
    strokeId = null
    points.length = 0
  }

  function drawLocal() {
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = state.size

    if (state.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    } else {
      ctx.globalCompositeOperation = "source-over"
      ctx.strokeStyle = state.color
    }

    if (points.length === 1) {
      const p = points[0]
      ctx.beginPath()
      ctx.arc(p.x, p.y, state.size / 2, 0, Math.PI * 2)
      ctx.fillStyle = state.tool === "eraser" ? "rgba(0,0,0,1)" : state.color
      ctx.fill()
    } else {
      ctx.beginPath()
      
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i]
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        ctx.quadraticCurveTo(a.x, a.y, mx, my)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function applyRemoteOps(ops) {
    if (!Array.isArray(ops)) return
    for (const op of ops) {
      if (op.type === "add") {
        drawRemote(op.op)
      } else if (op.type === "update") {
        drawRemoteUpdate(op)
      } else {
      }
    }
  }

  function drawRemote(op) {
    const kind = op.kind === "erase" ? "eraser" : "brush"
    const pts = op.points || []
    if (!pts.length) return

    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = op.size

    ctx.globalCompositeOperation = kind === "eraser"
      ? "destination-out"
      : "source-over"

    ctx.strokeStyle = op.color || "#000"

    if (pts.length === 1) {
      const p = pts[0]
      ctx.beginPath()
      ctx.arc(p.x, p.y, op.size / 2, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        ctx.quadraticCurveTo(a.x, a.y, mx, my)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawRemoteUpdate(m) {
    const append = m.append || []
    if (!append.length) return

    append.forEach(p => {
      ctx.save()
      ctx.globalCompositeOperation = state.tool === "eraser"
        ? "destination-out" : "source-over"
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }
  function emit(ops) {
    listeners.localOps.forEach(fn => fn(ops))
  }
  function onLocalOps(cb) {
    listeners.localOps.add(cb)
  }

  canvas.addEventListener("pointerdown", startDraw)
  window.addEventListener("pointermove", moveDraw)
  window.addEventListener("pointerup", endDraw)
  window.addEventListener("blur", endDraw)

  console.log("canvas engine ready")

  return {
    setTool: t => state.tool = t,
    setColor: c => state.color = c,
    setSize: s => state.size = s,
    onLocalOps,
    applyRemoteOps
  }
}
