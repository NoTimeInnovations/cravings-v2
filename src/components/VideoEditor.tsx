"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scissors, X, AlertTriangle, Download } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";

// Manual implementations to avoid Next.js webpack bundling issues with @ffmpeg/util
async function toBlobURL(url: string, mimeType: string): Promise<string> {
    const response = await fetch(url);
    const buf = await response.arrayBuffer();
    const blob = new Blob([buf], { type: mimeType });
    return URL.createObjectURL(blob);
}

async function fetchFile(file: File | Blob): Promise<Uint8Array> {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
}

interface VideoEditorProps {
    isOpen: boolean;
    onClose: () => void;
    videoFile: File;
    onComplete: (processedVideoBlob: Blob, thumbnailBlob: Blob) => void;
}

const MAX_OUTPUT_SIZE = 5 * 1024 * 1024; // 5MB

const QUALITY_PRESETS: Record<string, { label: string; crf: number; scale: string }> = {
    high: { label: "High Quality", crf: 23, scale: "" },
    medium: { label: "Medium Quality", crf: 28, scale: "-vf scale=720:-2" },
    low: { label: "Low Quality", crf: 33, scale: "-vf scale=480:-2" },
    verylow: { label: "Very Low Quality", crf: 38, scale: "-vf scale=360:-2" },
};

export default function VideoEditor({ isOpen, onClose, videoFile, onComplete }: VideoEditorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [duration, setDuration] = useState(0);
    const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
    const [quality, setQuality] = useState("medium");
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
    const [currentPreview, setCurrentPreview] = useState(0);

    // Load FFmpeg
    useEffect(() => {
        const load = async () => {
            try {
                const ffmpeg = new FFmpeg();
                ffmpegRef.current = ffmpeg;

                ffmpeg.on("progress", ({ progress: p }) => {
                    setProgress(`Processing... ${Math.round(p * 100)}%`);
                });

                const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                });

                setIsLoading(false);
            } catch (err) {
                console.error("Failed to load FFmpeg:", err);
                setProgress("Failed to load video editor. Please try again.");
            }
        };
        load();

        return () => {
            ffmpegRef.current?.terminate();
        };
    }, []);

    // Create video preview URL
    useEffect(() => {
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [videoFile]);

    // Set duration when video loads
    const handleVideoLoaded = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        const dur = video.duration;
        setDuration(dur);
        setTrimRange([0, dur]);
        estimateSize(0, dur, quality);
    }, [quality]);

    // Estimate output size based on trim and quality
    const estimateSize = useCallback((start: number, end: number, q: string) => {
        const trimDuration = end - start;
        const originalBitsPerSecond = (videoFile.size * 8) / (duration || trimDuration || 1);
        const preset = QUALITY_PRESETS[q];
        // CRF-based estimation: each CRF step roughly halves/doubles size
        const qualityFactor = Math.pow(0.85, preset.crf - 23);
        // Scale factor
        let scaleFactor = 1;
        if (q === "medium") scaleFactor = 0.5;
        else if (q === "low") scaleFactor = 0.3;
        else if (q === "verylow") scaleFactor = 0.15;

        const estimated = (originalBitsPerSecond * trimDuration * qualityFactor * scaleFactor) / 8;
        setEstimatedSize(Math.max(estimated, 50000)); // minimum 50KB estimate
    }, [videoFile.size, duration]);

    // Update estimate when trim or quality changes
    useEffect(() => {
        if (duration > 0) {
            estimateSize(trimRange[0], trimRange[1], quality);
        }
    }, [trimRange, quality, duration, estimateSize]);

    // Seek video to preview trim position
    const handlePreviewSeek = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentPreview(time);
        }
    }, []);

    // Generate thumbnail from video at a specific time
    const generateThumbnail = useCallback(async (time: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.src = videoUrl;
            video.currentTime = time;
            video.muted = true;
            video.oncanplay = () => {
                // Wait a frame for the video to render
                requestAnimationFrame(() => {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("Canvas not supported"));
                    ctx.drawImage(video, 0, 0);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error("Failed to generate thumbnail"));
                            video.remove();
                        },
                        "image/jpeg",
                        0.85
                    );
                });
            };
            video.onerror = () => reject(new Error("Video load error"));
        });
    }, [videoUrl]);

    // Process video with FFmpeg
    const handleProcess = async () => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) return;

        setIsProcessing(true);
        setProgress("Reading video file...");

        try {
            const inputData = await fetchFile(videoFile);
            await ffmpeg.writeFile("input.mp4", inputData);

            const preset = QUALITY_PRESETS[quality];
            const [start, end] = trimRange;
            const trimDuration = end - start;

            // Build FFmpeg args
            const args: string[] = [
                "-i", "input.mp4",
                "-ss", start.toFixed(2),
                "-t", trimDuration.toFixed(2),
                "-c:v", "libx264",
                "-crf", preset.crf.toString(),
                "-preset", "fast",
                "-movflags", "+faststart", // optimize for web streaming
                "-c:a", "aac",
                "-b:a", "128k",
            ];

            // Add scale filter if needed
            if (preset.scale) {
                args.push("-vf", preset.scale.replace("-vf ", ""));
            }

            args.push("-y", "output.mp4");

            setProgress("Processing video...");
            await ffmpeg.exec(args);

            const outputData = await ffmpeg.readFile("output.mp4");
            const outputBlob = new Blob([outputData], { type: "video/mp4" });

            if (outputBlob.size > MAX_OUTPUT_SIZE) {
                setProgress("");
                setIsProcessing(false);
                setEstimatedSize(outputBlob.size);
                return;
            }

            // Generate thumbnail from the start of the trimmed section
            setProgress("Generating thumbnail...");
            const thumbnailBlob = await generateThumbnail(start + 0.5);

            // Cleanup
            await ffmpeg.deleteFile("input.mp4");
            await ffmpeg.deleteFile("output.mp4");

            onComplete(outputBlob, thumbnailBlob);
        } catch (err) {
            console.error("Video processing error:", err);
            setProgress("Processing failed. Try reducing quality or trimming shorter.");
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const isSizeExceeded = estimatedSize !== null && estimatedSize > MAX_OUTPUT_SIZE;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Scissors className="h-5 w-5" />
                        Video Editor
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessing}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 space-y-5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            <p className="text-sm text-muted-foreground">Loading video editor...</p>
                        </div>
                    ) : (
                        <>
                            {/* Video Preview */}
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    onLoadedMetadata={handleVideoLoaded}
                                    className="w-full h-full object-contain"
                                    muted
                                    playsInline
                                />
                            </div>

                            {/* Trim Controls */}
                            {duration > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">
                                        Trim Video ({formatTime(trimRange[0])} - {formatTime(trimRange[1])})
                                        <span className="text-muted-foreground ml-2">
                                            Duration: {formatTime(trimRange[1] - trimRange[0])}
                                        </span>
                                    </Label>
                                    <div className="px-1">
                                        <Slider
                                            min={0}
                                            max={duration}
                                            step={0.1}
                                            value={trimRange}
                                            onValueChange={(val) => {
                                                const [s, e] = val as [number, number];
                                                setTrimRange([s, e]);
                                                handlePreviewSeek(s);
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>0:00</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Quality Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Quality</Label>
                                <Select value={quality} onValueChange={setQuality}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                                            <SelectItem key={key} value={key}>
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Size Estimate */}
                            <div className={`flex items-center gap-2 p-3 rounded-lg border ${isSizeExceeded ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" : "bg-muted/50"}`}>
                                {isSizeExceeded && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                                <div className="text-sm">
                                    <span className="font-medium">Estimated size: </span>
                                    <span className={isSizeExceeded ? "text-red-600 font-bold dark:text-red-400" : ""}>
                                        {estimatedSize ? formatSize(estimatedSize) : "Calculating..."}
                                    </span>
                                    {isSizeExceeded && (
                                        <p className="text-red-600 text-xs mt-1 dark:text-red-400">
                                            File size exceeds 5MB limit. Reduce quality or trim the video shorter.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Original file info */}
                            <p className="text-xs text-muted-foreground">
                                Original: {formatSize(videoFile.size)} &middot; {videoFile.type}
                            </p>

                            {/* Processing status */}
                            {progress && (
                                <div className="flex items-center gap-2 text-sm text-orange-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {progress}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleProcess}
                        disabled={isLoading || isProcessing || isSizeExceeded}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {isProcessing ? "Processing..." : "Apply & Upload"}
                    </Button>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
