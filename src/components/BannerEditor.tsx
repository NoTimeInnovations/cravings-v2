"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
    Scissors,
    Eraser,
    Palette,
    Undo2,
    ArrowLeft,
    X,
} from "lucide-react";

const BANNER_W = 1131;
const BANNER_H = 583;
const BANNER_ASPECT = BANNER_W / BANNER_H;

interface BannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onComplete: (editedImageUrl: string) => void;
}

interface ImageTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    selected: boolean;
}

export default function BannerEditor({ isOpen, onClose, imageUrl, onComplete }: BannerEditorProps) {
    const [step, setStep] = useState<"crop" | "edit">("crop");
    const [history, setHistory] = useState<string[]>([]);

    // The URL rendered in the <img> — updated after every edit operation
    const [displayUrl, setDisplayUrl] = useState("");

    // When true, the displayUrl-change useEffect skips rebuilding the canvas/transform
    // (used for in-place edits like eraser strokes, bg color fill)
    const skipRebuild = useRef(false);

    // Crop
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const cropImgRef = useRef<HTMLImageElement>(null);

    // Edit — container
    const outerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

    // Edit — image transform (position & size inside the banner viewport)
    const [transform, setTransform] = useState<ImageTransform>({ x: 0, y: 0, width: 0, height: 0, selected: false });
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [dragging, setDragging] = useState<null | "move" | "nw" | "ne" | "sw" | "se">(null);
    const dragStart = useRef({ mx: 0, my: 0, t: { x: 0, y: 0, width: 0, height: 0 } });

    // Edit — eraser (off-screen canvas = source of truth for pixel data)
    const eraserCanvas = useRef<HTMLCanvasElement | null>(null);
    const isErasingRef = useRef(false);
    const [activeTool, setActiveTool] = useState("none");
    const [brushSize, setBrushSize] = useState(20);
    const [bgColor, setBgColor] = useState("#ffffff");
    const [bannerBg, setBannerBg] = useState<string | null>(null);

    // ---- Reset on open ----
    useEffect(() => {
        if (isOpen) {
            setStep("crop");
            setDisplayUrl("");
            setActiveTool("none");
            setCrop(undefined);
            setCompletedCrop(undefined);
            setHistory([]);
            setTransform({ x: 0, y: 0, width: 0, height: 0, selected: false });
            setDragging(null);
            eraserCanvas.current = null;
            skipRebuild.current = false;
            setBannerBg(null);
        }
    }, [isOpen]);

    // ---- Measure container ----
    useEffect(() => {
        if (step !== "edit" || !outerRef.current) return;
        const measure = () => {
            const el = outerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            let w = rect.width;
            let h = w / BANNER_ASPECT;
            if (h > rect.height) { h = rect.height; w = h * BANNER_ASPECT; }
            setContainerSize({ w, h });
        };
        const raf = requestAnimationFrame(measure);
        window.addEventListener("resize", measure);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
    }, [step]);

    // ---- When displayUrl changes, rebuild eraser canvas & fit image ----
    // Skipped for in-place edits (eraser, bg color) via skipRebuild ref
    useEffect(() => {
        if (step !== "edit" || !displayUrl || containerSize.w === 0) return;
        if (skipRebuild.current) {
            skipRebuild.current = false;
            return;
        }
        const img = new Image();
        img.onload = () => {
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d")!.drawImage(img, 0, 0);
            eraserCanvas.current = c;

            const cW = containerSize.w;
            const cH = containerSize.h;
            const scale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight, 1);
            const iw = img.naturalWidth * scale;
            const ih = img.naturalHeight * scale;
            setTransform({ x: (cW - iw) / 2, y: (cH - ih) / 2, width: iw, height: ih, selected: false });
        };
        img.src = displayUrl;
    }, [displayUrl, step, containerSize.w, containerSize.h]);

    // ---- Crop ----
    const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        let cropW = width * 0.9;
        let cropH = cropW / BANNER_ASPECT;
        if (cropH > height * 0.9) { cropH = height * 0.9; cropW = cropH * BANNER_ASPECT; }
        setCrop({ unit: "px", x: (width - cropW) / 2, y: (height - cropH) / 2, width: cropW, height: cropH });
    }, []);

    const handleCropDone = useCallback(async () => {
        if (!completedCrop || !cropImgRef.current) return;
        const image = cropImgRef.current;
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d")!;
        const sx = image.naturalWidth / image.width;
        const sy = image.naturalHeight / image.height;
        c.width = Math.floor(completedCrop.width * sx);
        c.height = Math.floor(completedCrop.height * sy);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, completedCrop.x * sx, completedCrop.y * sy, completedCrop.width * sx, completedCrop.height * sy, 0, 0, c.width, c.height);
        const url = c.toDataURL("image/png");
        setDisplayUrl(url);
        setHistory([url]);
        setStep("edit");
    }, [completedCrop]);

    // ---- History ----
    const pushHistory = () => {
        if (eraserCanvas.current) {
            setHistory(prev => [...prev, eraserCanvas.current!.toDataURL("image/png")]);
        }
    };
    const handleUndo = () => {
        if (history.length <= 1) return;
        const prev = history[history.length - 2];
        setHistory(h => h.slice(0, -1));
        // Undo needs a full rebuild (new source image), so don't skip
        setDisplayUrl(prev);
    };

    // ---- Add BG Color ----
    const handleAddBgColor = () => {
        setBannerBg(bgColor);
    };

    // ---- Eraser ----
    const getEraserNaturalPos = (e: React.MouseEvent | React.TouchEvent) => {
        const ec = eraserCanvas.current;
        const cont = outerRef.current?.querySelector("[data-canvas-area]") as HTMLElement | null;
        if (!ec || !cont) return null;
        let clientX: number, clientY: number;
        if ("touches" in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX; clientY = e.clientY;
        }
        const contRect = cont.getBoundingClientRect();
        const relX = clientX - contRect.left - transform.x;
        const relY = clientY - contRect.top - transform.y;
        const sx = ec.width / transform.width;
        const sy = ec.height / transform.height;
        return { x: relX * sx, y: relY * sy, sx };
    };

    const startEraseStroke = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== "eraser") return;
        e.preventDefault();
        pushHistory();
        isErasingRef.current = true;
        eraseAtPos(e);
    };
    const eraseAtPos = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isErasingRef.current || !eraserCanvas.current) return;
        const pos = getEraserNaturalPos(e);
        if (!pos) return;
        const ctx = eraserCanvas.current.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize * pos.sx, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        skipRebuild.current = true;
        setDisplayUrl(eraserCanvas.current.toDataURL("image/png"));
    };
    const stopEraseStroke = () => { isErasingRef.current = false; };

    // ---- Resize / Move handlers ----
    const handlePointerDown = (e: React.PointerEvent, type: "move" | "nw" | "ne" | "sw" | "se") => {
        if (activeTool === "eraser") return;
        e.preventDefault();
        e.stopPropagation();
        setDragging(type);
        dragStart.current = { mx: e.clientX, my: e.clientY, t: { x: transform.x, y: transform.y, width: transform.width, height: transform.height } };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        const t = dragStart.current.t;

        if (dragging === "move") {
            setTransform(prev => ({ ...prev, x: t.x + dx, y: t.y + dy }));
            return;
        }

        const imgAspect = naturalSize.w / naturalSize.h;
        let newW = t.width, newH = t.height, newX = t.x, newY = t.y;

        if (dragging === "se") {
            newW = Math.max(40, t.width + dx); newH = newW / imgAspect;
        } else if (dragging === "sw") {
            newW = Math.max(40, t.width - dx); newH = newW / imgAspect;
            newX = t.x + (t.width - newW);
        } else if (dragging === "ne") {
            newW = Math.max(40, t.width + dx); newH = newW / imgAspect;
            newY = t.y + (t.height - newH);
        } else if (dragging === "nw") {
            newW = Math.max(40, t.width - dx); newH = newW / imgAspect;
            newX = t.x + (t.width - newW); newY = t.y + (t.height - newH);
        }
        setTransform(prev => ({ ...prev, x: newX, y: newY, width: newW, height: newH }));
    };

    const handlePointerUp = () => setDragging(null);

    const selectImage = (e: React.MouseEvent) => {
        if (activeTool === "eraser") return;
        e.stopPropagation();
        setTransform(prev => ({ ...prev, selected: true }));
    };
    const deselectImage = () => {
        if (activeTool !== "eraser") setTransform(prev => ({ ...prev, selected: false }));
    };

    // ---- Save: composite at BANNER_W x BANNER_H ----
    const handleSave = () => {
        const c = document.createElement("canvas");
        c.width = BANNER_W; c.height = BANNER_H;
        const ctx = c.getContext("2d")!;
        // Fill banner background color first
        if (bannerBg) {
            ctx.fillStyle = bannerBg;
            ctx.fillRect(0, 0, BANNER_W, BANNER_H);
        }
        const ec = eraserCanvas.current;
        if (ec && containerSize.w > 0) {
            const sx = BANNER_W / containerSize.w;
            const sy = BANNER_H / containerSize.h;
            ctx.drawImage(ec, 0, 0, ec.width, ec.height,
                transform.x * sx, transform.y * sy, transform.width * sx, transform.height * sy);
        }
        onComplete(c.toDataURL("image/png"));
        onClose();
    };

    const handleSkipEdit = () => {
        if (displayUrl) onComplete(displayUrl);
        onClose();
    };

    if (!isOpen) return null;

    const HANDLE = 10;
    const handles = transform.selected && activeTool !== "eraser" ? [
        { id: "nw" as const, cls: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
        { id: "ne" as const, cls: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
        { id: "sw" as const, cls: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
        { id: "se" as const, cls: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
    ] : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col w-[95vw] max-w-4xl h-[90vh] max-h-[95vh] overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b shrink-0">
                    <h2 className="text-base sm:text-lg font-semibold">
                        {step === "crop" ? "Crop Banner" : "Edit Banner"}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {step === "crop" ? (
                        <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Aspect ratio locked to 1131 : 583</p>
                            <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-lg min-h-0 overflow-hidden">
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}
                                    aspect={BANNER_ASPECT} minWidth={50} minHeight={50}
                                    className="max-h-full w-fit mx-auto flex justify-center"
                                    style={{ maxHeight: "100%", display: "flex" }}>
                                    <img ref={cropImgRef} alt="Crop preview" src={imageUrl} onLoad={onCropImageLoad}
                                        className="max-h-full w-auto object-contain"
                                        style={{ touchAction: "none", maxWidth: "100%", maxHeight: "100%" }} />
                                </ReactCrop>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4 gap-1.5 sm:gap-2">
                            {/* Toolbar */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-hide">
                                <Button variant={activeTool === "eraser" ? "default" : "outline"} size="sm"
                                    className="shrink-0 h-8 px-2 sm:px-3 text-xs"
                                    onClick={() => setActiveTool(activeTool === "eraser" ? "none" : "eraser")}>
                                    <Eraser className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Eraser</span>
                                </Button>
                                {activeTool === "eraser" && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <input type="range" min={5} max={50} value={brushSize}
                                            onChange={e => setBrushSize(Number(e.target.value))} className="w-16 sm:w-20" />
                                        <span className="text-xs text-gray-500 w-5">{brushSize}</span>
                                    </div>
                                )}
                                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                                    className="w-8 h-8 rounded border cursor-pointer p-0.5 shrink-0" />
                                <Button variant="outline" size="sm" onClick={handleAddBgColor}
                                    className="shrink-0 h-8 px-2 sm:px-3 text-xs">
                                    <Palette className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Add BG</span>
                                </Button>
                                {bannerBg && (
                                    <Button variant="outline" size="sm" onClick={() => setBannerBg(null)}
                                        className="shrink-0 h-8 px-2 sm:px-3 text-xs">
                                        <X className="h-3.5 w-3.5 sm:mr-1.5" />
                                        <span className="hidden sm:inline">Remove BG</span>
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={handleUndo}
                                    disabled={history.length <= 1}
                                    className="shrink-0 h-8 px-2 sm:px-3 text-xs">
                                    <Undo2 className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Undo</span>
                                </Button>
                            </div>

                            {/* Canvas area — 1131:583 aspect-locked container */}
                            <div ref={outerRef} className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                                <div
                                    data-canvas-area
                                    className="relative overflow-visible rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600"
                                    style={{
                                        width: containerSize.w || "100%",
                                        height: containerSize.h || "auto",
                                        aspectRatio: `${BANNER_W} / ${BANNER_H}`,
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        background: bannerBg || "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 16px 16px",
                                    }}
                                    onClick={deselectImage}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                >
                                    {displayUrl && transform.width > 0 && (
                                        <div
                                            className="absolute"
                                            style={{ left: transform.x, top: transform.y, width: transform.width, height: transform.height }}
                                            onClick={selectImage}
                                        >
                                            <img src={displayUrl} alt="Banner" draggable={false}
                                                className="w-full h-full object-fill pointer-events-none select-none" />

                                            {activeTool === "eraser" && (
                                                <div className="absolute inset-0" style={{ cursor: "crosshair", touchAction: "none" }}
                                                    onMouseDown={startEraseStroke} onMouseMove={eraseAtPos}
                                                    onMouseUp={stopEraseStroke} onMouseLeave={stopEraseStroke}
                                                    onTouchStart={startEraseStroke} onTouchMove={eraseAtPos}
                                                    onTouchEnd={stopEraseStroke} />
                                            )}

                                            {transform.selected && activeTool !== "eraser" && (
                                                <>
                                                    <div className="absolute inset-0 border-2 border-blue-500" style={{ cursor: "move" }}
                                                        onPointerDown={e => handlePointerDown(e, "move")} />
                                                    {handles.map(h => (
                                                        <div key={h.id}
                                                            className={`absolute z-10 bg-white border-2 border-blue-500 rounded-sm ${h.cls}`}
                                                            style={{ width: HANDLE, height: HANDLE }}
                                                            onPointerDown={e => handlePointerDown(e, h.id)} />
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-t shrink-0 gap-2">
                    {step === "crop" ? (
                        <>
                            <div />
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                                <Button size="sm" onClick={handleCropDone} disabled={!completedCrop}>
                                    <Scissors className="mr-1.5 h-4 w-4" /> Crop
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" className="px-2 sm:px-3 text-xs" onClick={() => setStep("crop")}>
                                <ArrowLeft className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Back to </span>Crop
                            </Button>
                            <div className="flex gap-1.5 sm:gap-2">
                                <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={onClose}>Cancel</Button>
                                <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={handleSkipEdit}>
                                    <span className="sm:hidden">Skip Edit</span>
                                    <span className="hidden sm:inline">Use Without Editing</span>
                                </Button>
                                <Button size="sm" className="text-xs px-2 sm:px-3" onClick={handleSave}>Save</Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
