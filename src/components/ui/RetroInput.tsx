import React from 'react';
interface RetroInputProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  name?: string;
  className?: string;
}
const RetroInput = ({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder = '',
  name = '',
  className = ''
}: RetroInputProps) => {
  return <div className={`mb-4 ${className}`}>
      <label className="block font-bold mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} name={name} className="w-full p-2 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
    </div>;
};
export default RetroInput;