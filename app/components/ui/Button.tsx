type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
};

export default function Button({
  children,
  variant = "primary",
  className = "",
}: ButtonProps) {

  const variants = {
    primary:
      "bg-[#047857] hover:bg-[#065f46] text-white",

    secondary:
      "bg-[#f8fafc] border border-gray-200 hover:bg-gray-100 text-black",

    danger:
      "bg-red-500 hover:bg-red-600 text-white",
  };

  return (
    <button
      className={`
        px-6 py-4 rounded-2xl font-bold transition
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}