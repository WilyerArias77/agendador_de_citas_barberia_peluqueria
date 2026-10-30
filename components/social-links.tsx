/* eslint-disable @next/next/no-img-element */

// Redes de Growing Solutions. Se muestran solo las que tengan enlace configurado en Vercel.
const networks = [
  { name: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL, icon: "/social-facebook.png" },
  { name: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL, icon: "/social-instagram.png" }
];

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function SocialLinks({ className = "" }: { className?: string }) {
  const available = networks.filter((network) => network.href?.trim());
  if (available.length === 0) return null;
  return <div className={`flex items-center justify-center gap-3 ${className}`}>
    {available.map((network) => <a key={network.name} href={normalizeUrl(network.href!.trim())} target="_blank" rel="noopener noreferrer" aria-label={`Growing Solutions en ${network.name}`} className="transition hover:scale-110"><img src={network.icon} alt={network.name} width={32} height={32} className="h-8 w-8" /></a>)}
  </div>;
}
