import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ZoomIn, ZoomOut, RotateCw, 
  RotateCcw, Check, Crop, Sparkles 
} from 'lucide-react';

/**
 * Production-grade, zero-dependency interactive Image Crop Modal.
 * Supports smooth pan/drag, zoom slider/wheel, rotation, and high-res canvas export.
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  targetSize = 400,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    setImageLoaded(true);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Dragging handlers (Mouse & Touch)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Wheel zoom inside viewport
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.8, prev + delta), 3.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Perform crisp Canvas Crop
  const handleCrop = () => {
    if (!imgRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize / aspectRatio;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Viewport box dimensions
    const viewportSize = containerRef.current.offsetWidth;
    const scaleFactor = targetSize / viewportSize;

    // Center canvas context
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

    // Calculate base rendering dimensions to fit the viewport initially
    const { width: imgW, height: imgH } = imageDimensions;
    let baseW = viewportSize;
    let baseH = viewportSize;
    if (imgW > imgH) {
      baseW = viewportSize * (imgW / imgH);
    } else {
      baseH = viewportSize * (imgH / imgW);
    }

    // Draw the image with offset
    const drawX = -baseW / 2 + (position.x / zoom);
    const drawY = -baseH / 2 + (position.y / zoom);

    ctx.drawImage(imgRef.current, drawX, drawY, baseW, baseH);

    // Export to compressed, high-quality JPEG Base64 data URL
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-outfit">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-surface border border-outline-var/30 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-outline-var/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Crop size={15} />
              </div>
              <h3 className="font-syne font-extrabold text-base text-text-primary tracking-tight">
                Adjust Profile Photo
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xs text-outline hover:text-text-primary hover:bg-surface-mid transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cropper Viewport */}
          <div className="px-5 flex flex-col items-center select-none">
            <div className="relative w-full max-w-[300px] sm:max-w-[320px] aspect-square bg-bg-base border border-outline-var/30 rounded-lg overflow-hidden flex items-center justify-center">
              {/* Interactive Draggable Canvas Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
                className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop Target"
                  onLoad={onImageLoad}
                  draggable={false}
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                    maxWidth: 'none',
                  }}
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Circular Mask & Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Outer Dimmed Layer with Circular Cutout */}
                  <div
                    className="w-full h-full border-2 border-primary/70 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    style={{
                      boxShadow: '0 0 0 9999px rgba(10, 14, 23, 0.65)',
                    }}
                  />
                  {/* Grid Crosshair */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-outline mt-2 flex items-center gap-1 font-syne uppercase tracking-wider">
              <Sparkles size={11} className="text-primary" /> Drag to reposition • Scroll or use slider to zoom
            </p>
          </div>

          {/* Controls Bar */}
          <div className="px-5 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, z - 0.15))}
                className="p-1.5 rounded-xs bg-surface-mid border border-outline-var/30 text-outline hover:text-text-primary transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <input
                type="range"
                min="0.8"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#6D28D9] h-1.5 bg-surface-mid rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, z + 0.15))}
                className="p-1.5 rounded-xs bg-surface-mid border border-outline-var/30 text-outline hover:text-text-primary transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <span className="text-[11px] font-mono text-outline w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Action Tools: Rotate & Reset */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-3 py-1.5 bg-surface-mid border border-outline-var/30 hover:border-primary/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw size={13} /> Rotate 90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-surface-mid border border-outline-var/30 hover:border-outline-var/60 text-text-muted hover:text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>

              <div className="text-[11px] text-text-muted font-mono">
                1:1 Avatar Frame
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 bg-surface-mid/60 border-t border-outline-var/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface border border-outline-var/40 text-text-muted hover:text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={!imageLoaded}
              className="px-5 py-2 bg-primary text-on-primary hover:bg-secondary-bright text-xs font-syne font-bold uppercase tracking-wider rounded-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check size={14} /> Apply Photo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
