import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageTitle?: string;
}

export function Lightbox({ isOpen, onClose, imageSrc, imageTitle }: LightboxProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full p-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <X className="h-8 w-8" />
        </button>
        
        <img
          src={imageSrc}
          alt={imageTitle || "Lightbox image"}
          className="max-w-full max-h-screen object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        
        {imageTitle && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 text-center">
            {imageTitle}
          </div>
        )}
      </div>
    </div>
  );
}