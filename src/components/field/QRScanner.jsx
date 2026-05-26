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
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", () => {
          animFrameRef.current = requestAnimationFrame(scanFrame);
        });
        videoRef.current.play();
      }
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const scanFrame = () => {
    if (doneRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { animFrameRef.current = requestAnimationFrame(scanFrame); return; }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        doneRef.current = true;
        stopCamera();
        onScan(code.data);
        return;
      }
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

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
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
            Aponte a câmera para o QR Code da etiqueta
          </p>
        )}
      </div>
    </motion.div>
  );
}