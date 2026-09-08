import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-[340px] bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl text-center">
        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-white">{title}</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
        </div>
        <div className="space-y-2 pt-1">
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-[#A4FF4F] hover:bg-[#90ED3B] text-black font-bold text-xs transition active:scale-95 cursor-pointer"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition active:scale-95 cursor-pointer"
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
