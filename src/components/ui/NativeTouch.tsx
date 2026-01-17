import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface NativeTouchProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  activeScale?: number;
  disabled?: boolean;
}

export const NativeTouch = ({ 
  children, 
  onClick, 
  className = '', 
  activeScale = 0.96,
  disabled = false 
}: NativeTouchProps) => {
  return (
    <motion.div
      whileTap={disabled ? undefined : { scale: activeScale }}
      onClick={disabled ? undefined : onClick}
      className={`cursor-pointer ${className}`}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
};
