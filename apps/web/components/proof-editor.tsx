"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

type Tool = "cover" | "brush";
type Mark =
  | { tool: "cover"; x: number; y: number; x2: number; y2: number }
  | { tool: "brush"; points: number[]; size: number };

const CHECKS = ["Real names", "Account numbers", "Addresses"];

export function ProofEditor({
  busy,
  error,
  onClose,
  onSave,
}: {
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("cover");
  const [brush, setBrush] = useState(36);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [draft, setDraft] = useState<Mark | null>(null);
  const [checks, setChecks] = useState([false, false, false]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [localError, setLocalError] = useState("");
  const ready = checks.every(Boolean);

  function paint(nextMarks: Mark[], nextDraft: Mark | null) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imageRef.current) ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    else {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (const mark of [...nextMarks, nextDraft].filter(Boolean) as Mark[]) drawMark(ctx, mark);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 900;
    canvas.height = 560;
    paint([], null);
  }, []);

  function loadImage(file: File) {
    setPdf(null);
    setLocalError("");
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1600 / image.width, 1200 / image.height);
      canvas.width = Math.max(280, Math.round(image.width * scale));
      canvas.height = Math.max(180, Math.round(image.height * scale));
      setMarks([]);
      setDraft(null);
      paint([], null);
      URL.revokeObjectURL(url);
    };
    image.onerror = () => setLocalError("That image could not be opened");
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
    if (!imageRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    drawing.current = true;
    const next = tool === "brush" ? { tool: "brush" as const, points: [x, y], size: brush } : { tool: "cover" as const, x, y, x2: x, y2: y };
    setDraft(next);
    paint(marks, next);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !draft) return;
    const { x, y } = point(event);
    const next = draft.tool === "brush" ? { ...draft, points: [...draft.points, x, y] } : { ...draft, x2: x, y2: y };
    setDraft(next);
    paint(marks, next);
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!draft) return;
    const next = [...marks, draft];
    setMarks(next);
    setDraft(null);
    paint(next, null);
  }

  function undo() {
    const next = marks.slice(0, -1);
    setMarks(next);
    paint(next, null);
  }

  async function save() {
    if (!ready) return;
    setLocalError("");
    if (pdf) {
      await onSave(pdf);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) {
      setLocalError("Choose a photo of the receipt first");
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setLocalError("Could not save the edited photo");
      return;
    }
    await onSave(new File([blob], "redacted-proof.png", { type: "image/png" }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-3xl rounded-[28px] bg-white p-4 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Redact the proof</h2>
            <p className="mt-1 text-sm text-neutral-500">Cover names, account numbers, and addresses. The bars are saved into the photo.</p>
          </div>
          <button type="button" className="text-sm text-neutral-500" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full border border-neutral-300 px-3 py-2 text-sm">
            Choose photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadImage(file);
              }}
            />
          </label>
          <button type="button" className={`rounded-full px-3 py-2 text-sm ${tool === "cover" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`} onClick={() => setTool("cover")}>
            Cover box
          </button>
          <button type="button" className={`rounded-full px-3 py-2 text-sm ${tool === "brush" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`} onClick={() => setTool("brush")}>
            Brush
          </button>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            Brush
            <input type="range" min={12} max={72} value={brush} onChange={(event) => setBrush(Number(event.target.value))} />
          </label>
          <button type="button" className="text-sm text-neutral-500" onClick={undo}>
            Undo
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="mt-3 w-full touch-none rounded-2xl border border-neutral-200 bg-neutral-100"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />

        <div className="mt-4 space-y-2 text-sm">
          <p className="text-neutral-600">Confirm these are gone before the file is public:</p>
          {CHECKS.map((label, index) => (
            <label key={label} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checks[index]}
                onChange={(event) => setChecks((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.checked : value)))}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!ready || busy} onClick={() => save().catch(() => undefined)}>
            {busy ? "Uploading" : "Upload proof"}
          </Button>
          <label className={ready ? "cursor-pointer text-sm text-[#c56a00]" : "cursor-not-allowed text-sm text-neutral-400"}>
            {pdf ? pdf.name : "Or choose a PDF that is already redacted"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={!ready}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                imageRef.current = null;
                setMarks([]);
                setPdf(file);
                paint([], null);
              }}
            />
          </label>
        </div>
        {(localError || error) && <p className="mt-3 text-sm text-[#ff5d73]">{localError || error}</p>}
        <p className="mt-3 text-xs leading-5 text-neutral-500">The public label is “Proof uploaded — not verified by the platform.”</p>
      </div>
    </div>
  );
}

function drawMark(ctx: CanvasRenderingContext2D, mark: Mark) {
  ctx.fillStyle = "#111111";
  ctx.strokeStyle = "#111111";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (mark.tool === "brush") {
    ctx.lineWidth = mark.size;
    ctx.beginPath();
    ctx.moveTo(mark.points[0], mark.points[1]);
    for (let i = 2; i < mark.points.length; i += 2) ctx.lineTo(mark.points[i], mark.points[i + 1]);
    ctx.stroke();
    return;
  }
  const x = Math.min(mark.x, mark.x2);
  const y = Math.min(mark.y, mark.y2);
  ctx.fillRect(x, y, Math.abs(mark.x2 - mark.x), Math.abs(mark.y2 - mark.y));
}
