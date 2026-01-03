import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "font-retro uppercase text-sm px-6 py-3 border-2 border-black transition-all active:translate-y-1 active:shadow-none outline-none";
  
  const variants = {
    primary: "bg-blue-600 text-white pixel-shadow hover:bg-blue-500",
    secondary: "bg-gray-600 text-white pixel-shadow hover:bg-gray-500",
    danger: "bg-red-600 text-white pixel-shadow hover:bg-red-500",
    success: "bg-green-600 text-white pixel-shadow hover:bg-green-500"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;