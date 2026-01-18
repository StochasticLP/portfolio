import Link from "next/link";

export function DownloadButton({ 
  href, 
  children, 
  className = "" 
}: { 
  href: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <a
      href={href}
      download
      className={`
        inline-flex items-center justify-center
        px-4 py-2 mt-4
        text-sm font-medium
        rounded-lg
        transition-colors duration-200
        bg-neutral-800 text-white hover:bg-neutral-700
        dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-300
        ${className}
      `}
    >
      {children}
    </a>
  );
}
