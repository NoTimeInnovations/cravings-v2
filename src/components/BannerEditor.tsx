"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Scissors,
    Crop as CropIcon,
    Eraser,
    Palette,
    Undo2,
    X,
} from "lucide-react";

/**
 * admin-v3 control tokens.
 *
 * Only the "page" variant uses them — admin-v2's modal keeps the shadcn Button
 * look it has always had. They are applied through `className`, which wins over
 * buttonVariants through the Button's own tailwind-merge.
 */
const V3_CONTROL =
    "shrink-0 inline-flex h-[34px] items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 shadow-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50";
const V3_CONTROL_ON =
    "shrink-0 inline-flex h-[34px] items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-900 bg-zinc-900 px-3 text-[13px] font-medium leading-none text-white shadow-none transition-colors hover:bg-zinc-800 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const V3_PRIMARY =
    "shrink-0 inline-flex h-[34px] items-center justify-center gap-[7px] whitespace-nowrap rounded-md bg-zinc-900 px-3.5 text-[13px] font-medium leading-none text-white shadow-none transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

const BANNER_W = 1131;
const BANNER_H = 583;
const BANNER_ASPECT = BANNER_W / BANNER_H;

interface BannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onComplete: (editedImageUrl: string) => void;
    /**
     * Extra controls for the page variant's toolbar — admin-v3 puts "Update"
     * (swap the image being edited) there. Ignored by the modal.
     */
    toolbarExtra?: React.ReactNode;
    /**
     * "modal" is the original centred overlay admin-v2 uses. "page" drops the
     * scrim and the fixed positioning so the editor can be swapped in as a
     * sub-page — which is how admin-v3 presents it, since a full-bleed image
     * editor inside a dialog fights the dialog for room.
     */
    variant?: "modal" | "page";
}

interface ImageTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    selected: boolean;
}

export default function BannerEditor({ isOpen, onClose, imageUrl, onComplete, variant = "modal", toolbarExtra }: BannerEditorProps) {
    const [step, setStep] = useState<"crop" | "edit">("edit");
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
    // Open straight into the edit step with the original image so the user
    // can move/erase/recolor first. Cropping is now opt-in (Crop button in
    // the edit toolbar) and freeform — no fixed aspect.
    useEffect(() => {
        if (isOpen) {
            setStep("edit");
            setDisplayUrl(imageUrl);
            setHistory(imageUrl ? [imageUrl] : []);
            setActiveTool("none");
            setCrop(undefined);
            setCompletedCrop(undefined);
            setTransform({ x: 0, y: 0, width: 0, height: 0, selected: false });
            setDragging(null);
            eraserCanvas.current = null;
            skipRebuild.current = false;
            setBannerBg(null);
        }
    }, [isOpen, imageUrl]);

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
    // Default selection covers the whole image (free aspect). User drags
    // handles to choose any rectangle.
    const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const c: Crop = { unit: "px", x: 0, y: 0, width, height };
        setCrop(c);
        setCompletedCrop({ ...c, unit: "px" } as PixelCrop);
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
        // toDataURL throws a SecurityError if anything drawn here came from
        // another origin — the canvas is "tainted". Callers must hand in a
        // same-origin URL (admin-v3 proxies saved images through /api/s3-image);
        // this catch is so that a miss reports itself instead of crashing the
        // screen with an unhandled runtime error.
        let out: string;
        try {
            out = c.toDataURL("image/png");
        } catch (err) {
            console.error("[BannerEditor] canvas export failed:", err);
            toast.error(
                "This image could not be edited — it is served from another domain. Upload it again from your device.",
            );
            return;
        }
        onComplete(out);
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

    const asPage = variant === "page";

    const shell = (
            <div className={asPage
                ? "flex w-full flex-col gap-3.5"
                : "bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col w-[95vw] max-w-4xl h-[90vh] max-h-[95vh] overflow-hidden"}
                onClick={asPage ? undefined : e => e.stopPropagation()}>

                {/* The page variant has no header of its own: the shell's
                    breadcrumb and back arrow already say where you are. */}
                {asPage ? null : (
                    <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b shrink-0">
                        <h2 className="text-base sm:text-lg font-semibold">
                            {step === "crop" ? "Crop Banner" : "Edit Banner"}
                        </h2>
                        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className={asPage
                    ? "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    : "flex-1 flex flex-col min-h-0 overflow-hidden"}>
                    {step === "crop" ? (
                        <div className={asPage
                            ? "flex flex-col p-4 gap-2"
                            : "flex-1 flex flex-col min-h-0 p-2 sm:p-4"}>
                            <p className={asPage
                                ? "text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500"
                                : "text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2"}>
                                Drag the handles to select any area — free aspect.
                            </p>
                            <div className={asPage
                                ? "flex h-[380px] max-h-[52vh] items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                                : "flex-1 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-lg min-h-0 overflow-hidden"}>
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}
                                    minWidth={20} minHeight={20}
                                    className="max-h-full w-fit mx-auto flex justify-center"
                                    style={{ maxHeight: "100%", display: "flex" }}>
                                    <img ref={cropImgRef} alt="Crop preview" src={displayUrl || imageUrl} onLoad={onCropImageLoad}
                                        className="max-h-full w-auto object-contain"
                                        style={{ touchAction: "none", maxWidth: "100%", maxHeight: "100%" }} />
                                </ReactCrop>
                            </div>
                        </div>
                    ) : (
                        <div className={asPage
                            ? "flex flex-col"
                            : "flex-1 flex flex-col min-h-0 p-2 sm:p-4 gap-1.5 sm:gap-2"}>
                            {/* Toolbar. As a page it is the card's header strip, so it
                                carries the same 4/3 padding and divider every other v3
                                card header uses. */}
                            <div className={asPage
                                ? "flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-100 px-4 py-3 scrollbar-hide dark:border-zinc-800"
                                : "flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-hide"}>
                                <Button variant="outline" size="sm"
                                    className={asPage ? V3_CONTROL : "shrink-0 h-8 px-2 sm:px-3 text-xs"}
                                    onClick={() => { setActiveTool("none"); setStep("crop"); }}
                                    disabled={!displayUrl}>
                                    <CropIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className={asPage ? undefined : "hidden sm:inline"}>Crop</span>
                                </Button>
                                <Button variant={activeTool === "eraser" ? "default" : "outline"} size="sm"
                                    className={asPage
                                        ? (activeTool === "eraser" ? V3_CONTROL_ON : V3_CONTROL)
                                        : "shrink-0 h-8 px-2 sm:px-3 text-xs"}
                                    onClick={() => setActiveTool(activeTool === "eraser" ? "none" : "eraser")}>
                                    <Eraser className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className={asPage ? undefined : "hidden sm:inline"}>Eraser</span>
                                </Button>
                                {activeTool === "eraser" && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <input type="range" min={5} max={50} value={brushSize}
                                            onChange={e => setBrushSize(Number(e.target.value))} className="w-16 sm:w-20" />
                                        <span className={asPage
                                            ? "w-5 text-[12px] tabular-nums text-zinc-500 dark:text-zinc-400"
                                            : "text-xs text-gray-500 w-5"}>{brushSize}</span>
                                    </div>
                                )}
                                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                                    aria-label="Background colour"
                                    className={asPage
                                        ? "h-[34px] w-[34px] shrink-0 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800"
                                        : "w-8 h-8 rounded border cursor-pointer p-0.5 shrink-0"} />
                                <Button variant="outline" size="sm" onClick={handleAddBgColor}
                                    className={asPage ? V3_CONTROL : "shrink-0 h-8 px-2 sm:px-3 text-xs"}>
                                    <Palette className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className={asPage ? undefined : "hidden sm:inline"}>Add BG</span>
                                </Button>
                                {bannerBg && (
                                    <Button variant="outline" size="sm" onClick={() => setBannerBg(null)}
                                        className={asPage ? V3_CONTROL : "shrink-0 h-8 px-2 sm:px-3 text-xs"}>
                                        <X className="h-3.5 w-3.5 sm:mr-1.5" />
                                        <span className={asPage ? undefined : "hidden sm:inline"}>Remove BG</span>
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={handleUndo}
                                    disabled={history.length <= 1}
                                    className={asPage ? V3_CONTROL : "shrink-0 h-8 px-2 sm:px-3 text-xs"}>
                                    <Undo2 className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className={asPage ? undefined : "hidden sm:inline"}>Undo</span>
                                </Button>
                                {asPage && toolbarExtra ? (
                                    <div className="ml-auto flex shrink-0 items-center gap-2">{toolbarExtra}</div>
                                ) : null}
                            </div>

                            {/* Canvas area — 1131:583 aspect-locked container. As a
                                page its height comes from that ratio (capped), rather
                                than stretching to fill a tall card. */}
                            {/* measure() needs a DEFINITE height — it derives the
                                canvas from the outer width, then shrinks it if that
                                exceeds the outer height, so an auto-height parent
                                pins the canvas to 0 and nothing ever renders. As a
                                page the height comes from the banner ratio applied to
                                the column width (capped), NOT from vh/vw: the settings
                                column is nothing like the viewport width. */}
                            <div className={asPage ? "p-4" : "contents"}>
                            <div
                                ref={outerRef}
                                className={asPage
                                    ? "mx-auto flex w-full items-center justify-center overflow-hidden"
                                    : "flex-1 flex items-center justify-center min-h-0 overflow-hidden"}
                                style={asPage
                                    ? { aspectRatio: `${BANNER_W} / ${BANNER_H}`, maxHeight: 380 }
                                    : undefined}
                            >
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
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={asPage
                    ? "flex shrink-0 items-center justify-between gap-2"
                    : "flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-t shrink-0 gap-2"}>
                    {step === "crop" ? (
                        <>
                            <Button variant="ghost" size="sm"
                                className={asPage ? V3_CONTROL : "px-2 sm:px-3 text-xs"}
                                onClick={() => setStep("edit")}>
                                Back
                            </Button>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleCropDone} disabled={!completedCrop}
                                    className={asPage ? V3_PRIMARY : undefined}>
                                    <Scissors className={asPage ? "h-3.5 w-3.5" : "mr-1.5 h-4 w-4"} />
                                    Apply crop
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div />
                            <div className="flex gap-1.5 sm:gap-2">
                                <Button variant="outline" size="sm"
                                    className={asPage ? V3_CONTROL : "text-xs px-2 sm:px-3"}
                                    onClick={onClose}>Cancel</Button>
                                <Button variant="outline" size="sm"
                                    className={asPage ? V3_CONTROL : "text-xs px-2 sm:px-3"}
                                    onClick={handleSkipEdit}>
                                    {asPage ? (
                                        <span>Use as is</span>
                                    ) : (
                                        <>
                                            <span className="sm:hidden">Skip Edit</span>
                                            <span className="hidden sm:inline">Use Without Editing</span>
                                        </>
                                    )}
                                </Button>
                                <Button size="sm"
                                    className={asPage ? V3_PRIMARY : "text-xs px-2 sm:px-3"}
                                    onClick={handleSave}>Save</Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
    );

    if (asPage) return shell;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            {shell}
        </div>
    );
}
