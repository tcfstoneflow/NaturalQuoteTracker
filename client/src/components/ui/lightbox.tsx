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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const lightboxContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80"
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
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
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 hover:scale-110 cursor-pointer"
          style={{ 
            zIndex: 1000000,
            position: 'absolute'
          }}
        >
          <X className="h-8 w-8" />
        </div>
        
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