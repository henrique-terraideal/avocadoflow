import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Use BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        detector.detect(canvas).then(barcodes => {
          if (barcodes.length > 0) {
            stopCamera();
            onScan(barcodes[0].rawValue);
            return;
          }
          requestAnimationFrame(scanFrame);
        }).catch(() => requestAnimationFrame(scanFrame));
      } else {
        // Fallback: keep scanning
        requestAnimationFrame(scanFrame);
      }
    } else {
      requestAnimationFrame(scanFrame);
    }
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
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/60 rounded-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
        ) : (
          <p className="text-white/70 text-center mt-4 text-sm">
            Aponte a câmera para o QR Code
          </p>
        )}

        {!("BarcodeDetector" in window) && (
          <div className="mt-4 bg-white/10 rounded-xl p-4">
            <p className="text-white/80 text-xs text-center">
              Seu navegador não suporta leitura de QR Code nativa. 
              Use o Chrome no Android para melhor experiência.
            </p>
            <div className="mt-3">
              <label className="text-white/60 text-xs">Cole o conteúdo do QR Code:</label>
              <input
                type="text"
                placeholder='{"operator":"Nome","operation":"01","orchard":"P1"}'
                className="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-xs border border-white/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value) {
                    stopCamera();
                    onScan(e.target.value);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}