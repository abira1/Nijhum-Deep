import React from 'react';
interface RetroButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}
const RetroButton = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false
}: RetroButtonProps) => {
  const baseStyles = 'font-bold py-2 px-4 border-2 border-black transition-colors duration-200';
  const variantStyles = variant === 'primary' ? 'bg-black text-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-gray-200';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variantStyles} ${disabledStyles} ${className}`}>
      {children}
    </button>;
};
export default RetroButton;