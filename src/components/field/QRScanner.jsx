import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import jsQR from "jsqr";

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const doneRef = useRef(false);
  const lastScanRef = useRef(0);
  const trackRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      doneRef.current = true;
      stopCamera();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });

      // Ativa foco contínuo automático se o dispositivo suportar
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      if (track && track.applyConstraints) {
        const capabilities = track.getCapabilities?.() || {};
        if (capabilities.focusMode?.includes?.("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
        }
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadedmetadata", () => {
          videoRef.current.play();
          animFrameRef.current = requestAnimationFrame(scanFrame);
        });
      }
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const [tapPoint, setTapPoint] = useState(null);

  const handleTapFocus = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTapPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setTapPoint(null), 800);

    const track = trackRef.current;
    if (!track) return;
    const capabilities = track.getCapabilities?.() || {};
    if (capabilities.focusMode?.includes?.("manual") && capabilities.pointsOfInterest) {
      await track.applyConstraints({
        advanced: [{ focusMode: "manual", pointsOfInterest: [{ x, y }] }]
      }).catch(() => {});
      // Volta para contínuo após focar
      setTimeout(() => {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }, 1500);
    }
  };

  const scanFrame = (timestamp) => {
    if (doneRef.current) return;

    // Throttle: só processa a cada ~100ms (10fps é suficiente para QR)
    if (timestamp - lastScanRef.current < 100) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    lastScanRef.current = timestamp;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Escaneia apenas a região central (60% do frame) para mais velocidade
    const cropSize = Math.floor(Math.min(vw, vh) * 0.6);
    const cropX = Math.floor((vw - cropSize) / 2);
    const cropY = Math.floor((vh - cropSize) / 2);

    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const imageData = ctx.getImageData(0, 0, cropSize, cropSize);
    const code = jsQR(imageData.data, cropSize, cropSize, {
      inversionAttempts: "attemptBoth",
    });

    if (code) {
      doneRef.current = true;
      stopCamera();
      onScan(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
    >
      <div className="relative w-full max-w-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { doneRef.current = true; stopCamera(); onClose(); }}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square" onClick={handleTapFocus}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />

          {/* Tap to focus indicator */}
          {tapPoint && (
            <motion.div
              initial={{ opacity: 1, scale: 1.4 }}
              animate={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="absolute w-12 h-12 border-2 border-yellow-400 rounded-full pointer-events-none"
              style={{ left: tapPoint.x - 24, top: tapPoint.y - 24 }}
            />
          )}

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
              {/* Linha de scan animada */}
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-primary/80"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
        ) : (
          <p className="text-white/70 text-center mt-4 text-sm">
            Aponte o QR Code para dentro da área
          </p>
        )}
      </div>
    </motion.div>
  );
}