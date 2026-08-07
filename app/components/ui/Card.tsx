type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({
  children,
  className = "",
}: CardProps) {

  return (
    <div
      className={`
        bg-white rounded-3xl border border-gray-100
        shadow-sm p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}