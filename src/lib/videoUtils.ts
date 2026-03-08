import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const MAX_DURATION = 120; // seconds
const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const TARGET_HEIGHT = 480;

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
  
  const ffmpeg = new FFmpeg();
  
  ffmpeg.on("log", ({ message }) => {
    console.log("[ffmpeg]", message);
  });
  
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(progress, 1));
    });
  }

  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
  });
  
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export interface VideoProcessResult {
  file: File;
  duration: number;
}

/**
 * Get video duration from a File
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to read video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Process video: validate duration, compress to 480p, ensure < 4MB
 */
export async function processVideo(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<VideoProcessResult> {
  // Check duration first
  onProgress?.("Checking video...", 0);
  const duration = await getVideoDuration(file);
  
  if (duration > MAX_DURATION) {
    throw new Error(`Video is ${Math.round(duration)}s long. Maximum allowed is ${MAX_DURATION}s.`);
  }

  onProgress?.("Loading processor...", 0.05);
  const ffmpeg = await getFFmpeg((p) => {
    onProgress?.("Compressing video...", 0.1 + p * 0.7);
  });

  const inputName = "input" + getExtension(file.name);
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Calculate target bitrate: aim for ~70% of max to leave room
  const targetSize = MAX_SIZE * 0.7; // bytes
  const targetBitrateKbps = Math.floor((targetSize * 8) / duration / 1000);
  const videoBitrate = Math.min(targetBitrateKbps - 64, 1500); // reserve 64kbps for audio
  const clampedBitrate = Math.max(videoBitrate, 200);

  // First pass: compress to 480p with calculated bitrate
  await ffmpeg.exec([
    "-i", inputName,
    "-vf", `scale=-2:${TARGET_HEIGHT}`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-b:v", `${clampedBitrate}k`,
    "-maxrate", `${clampedBitrate * 1.5}k`,
    "-bufsize", `${clampedBitrate * 2}k`,
    "-c:a", "aac",
    "-b:a", "64k",
    "-movflags", "+faststart",
    "-y",
    outputName,
  ]);

  onProgress?.("Finalizing...", 0.85);

  let outputData = await ffmpeg.readFile(outputName) as Uint8Array;

  // If still too large, try again with lower bitrate
  if (outputData.length > MAX_SIZE) {
    const reducedBitrate = Math.floor(clampedBitrate * (MAX_SIZE / outputData.length) * 0.85);
    const finalBitrate = Math.max(reducedBitrate, 100);
    
    await ffmpeg.exec([
      "-i", inputName,
      "-vf", `scale=-2:${TARGET_HEIGHT}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-b:v", `${finalBitrate}k`,
      "-maxrate", `${finalBitrate * 1.5}k`,
      "-bufsize", `${finalBitrate * 2}k`,
      "-c:a", "aac",
      "-b:a", "48k",
      "-movflags", "+faststart",
      "-y",
      outputName,
    ]);
    
    outputData = await ffmpeg.readFile(outputName) as Uint8Array;
  }

  if (outputData.length > MAX_SIZE) {
    throw new Error("Video could not be compressed under 4MB. Try a shorter or lower-quality video.");
  }

  // Clean up
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onProgress?.("Done!", 1);

  const blob = new Blob([outputData], { type: "video/mp4" });
  const outputFile = new File([blob], "video.mp4", { type: "video/mp4" });

  return { file: outputFile, duration };
}

/**
 * Upload processed video to Cloudflare Worker
 */
export async function uploadVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
  const url = `https://video-upload-api.raselsh.workers.dev/?filename=${encodeURIComponent(filename)}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.success && resp.url) {
            resolve(resp.url);
          } else {
            reject(new Error(resp.error || "Upload failed"));
          }
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : ".mp4";
}
