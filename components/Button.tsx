// =============================
// components/Button.tsx
// =============================

"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}

export default function Button({ children, onClick, type = "button", className = "", disabled = false }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-[#FB8500] hover:bg-[#FFB703] text-white font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}


// =============================
// components/Input.tsx
// =============================

"use client";

interface InputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function Input({ type = "text", value, onChange, placeholder = "", className = "", required = false }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none ${className}`}
    />
  );
}
