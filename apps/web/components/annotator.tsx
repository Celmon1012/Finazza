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

const colors = ["#ff7a18", "#ffc14d", "#ffffff", "#ff5d73", "#7dd3fc"];

export function Annotator() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(3);
  const [label, setLabel] = useState("Note");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [caption, setCaption] = useState("Annotated chart");
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
        {colors.map((swatch) => (
          <button key={swatch} type="button" aria-label={swatch} className="h-7 w-7 rounded-full border border-neutral-300" style={{ background: swatch, outline: color === swatch ? "2px solid white" : undefined }} onClick={() => setColor(swatch)} />
        ))}
        <label className="text-xs text-neutral-500">
          Size
          <input type="range" min={2} max={12} value={size} onChange={(event) => setSize(Number(event.target.value))} />
        </label>
        {tool === "text" && <input className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm" value={label} onChange={(event) => setLabel(event.target.value)} />}
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
      <input className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={caption} onChange={(event) => setCaption(event.target.value)} />
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
