type InputProps = {
  placeholder?: string;
  value?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  className?: string;
  type?: string;
};

export default function Input({
  placeholder,
  value,
  onChange,
  className = "",
  type = "text",
}: InputProps) {

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`
        w-full bg-[#f8fafc]
        border border-gray-200
        rounded-2xl px-5 h-14
        outline-none transition
        focus:border-[#047857]
        focus:ring-4 focus:ring-green-100
        ${className}
      `}
    />
  );
}