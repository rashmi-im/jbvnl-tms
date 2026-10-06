import React from 'react';
import { X } from 'lucide-react';

export function PhotoModal({ photoName, onClose }) {
  if (!photoName) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          padding: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
        <img
          src={`/api/photo/${photoName}`}
          alt="Transformer Photo"
          style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', borderRadius: 8 }}
        />
      </div>
    </div>
  );
}
