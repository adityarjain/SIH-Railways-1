import { useEffect } from 'react';

/**
 * Escape-to-close plus body scroll lock, shared by Modal and Drawer. These two
 * components previously carried byte-identical copies of this effect.
 *
 * The lock is refcounted because overlays can be open at the same time -
 * BlockPlanning mounts BlockDrawer and the decision-trace Modal together. With
 * the per-component version, closing either one restored body scroll while the
 * other was still open.
 */

let lockCount = 0;

const lockBodyScroll = () => {
  lockCount += 1;
  if (lockCount === 1) document.body.style.overflow = 'hidden';
};

const releaseBodyScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
};

export const useDismissable = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    lockBodyScroll();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      releaseBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
};
