import React, { useState } from 'react';
import { toFullImageUrl } from '../utils/image-url';

interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: 300,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 16,
        }}
      >
        No images available
      </div>
    );
  }

  return (
    <div>
      {/* Hero image */}
      <img
        src={toFullImageUrl(images[activeIndex])}
        alt={`Venue photo ${activeIndex + 1}`}
        style={{
          width: '100%',
          maxHeight: 400,
          objectFit: 'cover',
          borderRadius: 12,
          display: 'block',
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={toFullImageUrl(image)}
              alt={`Thumbnail ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 8,
                cursor: 'pointer',
                border: `2px solid ${index === activeIndex ? '#2563eb' : 'transparent'}`,
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
