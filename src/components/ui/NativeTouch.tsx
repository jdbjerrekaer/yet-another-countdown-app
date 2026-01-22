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
  disabled = false 
}: NativeTouchProps) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`cursor-pointer active:scale-[0.96] transition-transform duration-150 ${className}`}
    >
      {children}
    </div>
  );
};
