import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
      // Disable pointer events on all elements except the lightbox
      const allElements = document.querySelectorAll('*:not([data-lightbox])');
      allElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'none';
      });
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
      // Re-enable pointer events
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = '';
      });
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const lightboxContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      data-lightbox="container"
      style={{ 
        zIndex: 999999, 
        pointerEvents: 'auto',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="relative max-w-7xl max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
          style={{ 
            zIndex: 1000000,
            pointerEvents: 'auto',
            position: 'absolute'
          }}
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

  return createPortal(lightboxContent, document.body);
}