"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "./ui";

type Tool = "pen" | "line" | "arrow" | "rect" | "text";
type Shape =
  | { tool: "pen"; points: number[]; color: string; size: number }
  | { tool: "line" | "arrow" | "rect"; x: number; y: number; x2: number; y2: number; color: string; size: number }
  | { tool: "text"; x: number; y: number; text: string; color: string; size: number };

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToHsv(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function ColorWheel({ color, onChange }: { color: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hsv = hexToHsv(color);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = canvas.width;
    const radius = size / 2;
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x + 0.5 - radius;
        const dy = y + 0.5 - radius;
        const dist = Math.hypot(dx, dy) / (radius - 1);
        const index = (y * size + x) * 4;
        if (dist > 1) {
          image.data[index + 3] = 0;
          continue;
        }
        let hue = (Math.atan2(dy, dx) * 180) / Math.PI + 180;
        if (hue >= 360) hue -= 360;
        const rgb = hsvToRgb(hue, Math.min(1, dist), 1);
        image.data[index] = rgb.r;
        image.data[index + 1] = rgb.g;
        image.data[index + 2] = rgb.b;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    const angle = ((hsv.h - 180) * Math.PI) / 180;
    const marker = hsv.s * (radius - 8);
    ctx.beginPath();
    ctx.arc(radius + Math.cos(angle) * marker, radius + Math.sin(angle) * marker, 6, 0, Math.PI * 2);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hsv.h, hsv.s]);

  function pick(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const radius = canvas.width / 2;
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    const dist = Math.min(1, Math.hypot(x - radius, y - radius) / (radius - 1));
    let hue = (Math.atan2(y - radius, x - radius) * 180) / Math.PI + 180;
    if (hue >= 360) hue -= 360;
    onChange(hsvToHex(hue, dist, hsv.v));
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-3 py-2">
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        aria-label="Colour wheel"
        className="h-32 w-32 touch-none cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
      />
      <label className="flex w-24 flex-col gap-1 text-xs text-neutral-500">
        Colour
        <span className="h-7 w-7 rounded-full border border-neutral-300" style={{ background: color }} />
        Brightness
        <input
          aria-label="Colour brightness"
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={(event) => onChange(hsvToHex(hsv.h, hsv.s, Number(event.target.value) / 100))}
        />
      </label>
    </div>
  );
}

export function Annotator() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ff7a18");
  const [size, setSize] = useState(3);
  const [label, setLabel] = useState("Note");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drawing = useRef(false);

  function paint(nextShapes: Shape[], nextDraft: Shape | null) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (imageRef.current) ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    for (const shape of [...nextShapes, nextDraft].filter(Boolean) as Shape[]) drawShape(ctx, shape);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 960;
    canvas.height = 540;
    paint([], null);
  }, []);

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1100 / image.width, 700 / image.height);
      canvas.width = Math.max(320, Math.round(image.width * scale));
      canvas.height = Math.max(200, Math.round(image.height * scale));
      setShapes([]);
      paint([], null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const canvas = canvasRef.current!;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function down(event: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = point(event);
    drawing.current = true;
    if (tool === "text") {
      const next = [...shapes, { tool: "text" as const, x, y, text: label || "Note", color, size: Math.max(size, 8) * 5 }];
      setShapes(next);
      paint(next, null);
      drawing.current = false;
      return;
    }
    if (tool === "pen") setDraft({ tool: "pen", points: [x, y], color, size });
    else setDraft({ tool, x, y, x2: x, y2: y, color, size });
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !draft) return;
    const { x, y } = point(event);
    const next =
      draft.tool === "pen"
        ? { ...draft, points: [...draft.points, x, y] }
        : { ...draft, x2: x, y2: y };
    setDraft(next);
    paint(shapes, next);
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (draft) {
      const next = [...shapes, draft];
      setShapes(next);
      setDraft(null);
      paint(next, null);
    }
  }

  async function publish() {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) {
      setError("Upload a chart image first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not export the drawing");
      const form = new FormData();
      form.append("files", new File([blob], "annotated-chart.png", { type: "image/png" }));
      const uploaded = await api<{ files: { url: string; kind: "image" }[] }>("/api/uploads", { method: "POST", body: form });
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text: caption, attachments: uploaded.files }),
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the chart");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <p className="text-sm text-neutral-500">Upload a chart screenshot, draw on it, then post the image. Nothing here calls a market-data feed.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-full border border-neutral-300 px-3 py-2 text-sm">
          Upload chart
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
        </label>
        {(["pen", "line", "arrow", "rect", "text"] as Tool[]).map((item) => (
          <button key={item} type="button" className={`rounded-full px-3 py-2 text-sm capitalize ${tool === item ? "bg-neutral-200" : "bg-neutral-100"}`} onClick={() => setTool(item)}>
            {item}
          </button>
        ))}
        <ColorWheel color={color} onChange={setColor} />
        <label className="text-xs text-neutral-500">
          Size
          <input type="range" min={2} max={12} value={size} onChange={(event) => setSize(Number(event.target.value))} />
        </label>
        {tool === "text" && (
          <label className="text-xs text-neutral-500">
            Text on the chart
            <input className="mt-1 block rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
        )}
        <button type="button" className="text-sm text-neutral-500" onClick={() => { const next = shapes.slice(0, -1); setShapes(next); paint(next, null); }}>
          Undo
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-2xl border border-neutral-200"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <label className="block text-sm">
        <span className="font-medium">Post text</span>
        <span className="mt-1 block text-xs leading-5 text-neutral-500">The words of the post. The drawing stays on the chart.</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          maxLength={500}
          placeholder="Write what you want to say with this chart"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>
      {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
      <Button type="button" disabled={busy} onClick={publish}>
        Post annotated chart
      </Button>
    </div>
  );
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.tool === "text" ? 2 : shape.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (shape.tool === "pen") {
    ctx.beginPath();
    ctx.moveTo(shape.points[0], shape.points[1]);
    for (let i = 2; i < shape.points.length; i += 2) ctx.lineTo(shape.points[i], shape.points[i + 1]);
    ctx.stroke();
    return;
  }
  if (shape.tool === "text") {
    ctx.font = `${shape.size}px sans-serif`;
    ctx.fillText(shape.text, shape.x, shape.y);
    return;
  }
  if (shape.tool === "rect") {
    ctx.strokeRect(shape.x, shape.y, shape.x2 - shape.x, shape.y2 - shape.y);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(shape.x, shape.y);
  ctx.lineTo(shape.x2, shape.y2);
  ctx.stroke();
  if (shape.tool === "arrow") {
    const angle = Math.atan2(shape.y2 - shape.y, shape.x2 - shape.x);
    const head = 12 + shape.size;
    ctx.beginPath();
    ctx.moveTo(shape.x2, shape.y2);
    ctx.lineTo(shape.x2 - head * Math.cos(angle - 0.4), shape.y2 - head * Math.sin(angle - 0.4));
    ctx.lineTo(shape.x2 - head * Math.cos(angle + 0.4), shape.y2 - head * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }
}
