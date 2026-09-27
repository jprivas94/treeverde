import { useEffect } from "react";

export default function ImageViewModal({ images, currentIndex, onClose, onNavigate }) {
  const current = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, hasPrev, hasNext, currentIndex, onNavigate]);

  const handleDownload = async () => {
    try {
      const res = await fetch(current.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = current.title + " - Treeverde";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(current.imageUrl, "_blank");
    }
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/40 to-transparent">
        <span className="text-white/70 text-sm font-medium truncate max-w-[40%]">{current.title}</span>
        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="text-white/50 text-xs bg-white/10 px-2.5 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition text-sm"
            aria-label="Descargar" title="Descargar imagen"
          >
            ⬇
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition text-lg"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/25 hover:text-white transition text-xl sm:text-2xl backdrop-blur-sm"
          aria-label="Anterior"
        >
          ❮
        </button>
      )}

      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.imageUrl}
          alt={current.title || "Imagen"}
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
          style={{ boxShadow: "0 0 60px rgba(0,0,0,0.4)" }}
          draggable={false}
        />
      </div>

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/25 hover:text-white transition text-xl sm:text-2xl backdrop-blur-sm"
          aria-label="Siguiente"
        >
          ❯
        </button>
      )}
    </div>
  );
}
