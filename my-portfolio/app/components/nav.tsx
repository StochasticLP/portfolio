"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitch } from "./theme-switch";
import { metaData, socialLinks } from "../lib/config";
import {
  FaGithub,
  FaRss,
  FaLinkedinIn,
} from "react-icons/fa6";
import { TbMailFilled } from "react-icons/tb";

const navItems = {
  "/blog": { name: "Blog" },
  "/projects": { name: "Projects" },
  "/photos": { name: "Photos" },
};

function SocialLinks() {
  const socials = [
    { href: socialLinks.github, icon: <FaGithub />, key: "github" },
    { href: socialLinks.linkedin, icon: <FaLinkedinIn />, key: "linkedin" },
    { href: socialLinks.email, icon: <TbMailFilled />, key: "email" },
    { href: "/rss.xml", icon: <FaRss />, key: "rss", self: true },
  ];
  return (
    <div className="flex text-lg gap-3.5 items-center">
      {socials.map(({ href, icon, key, self }) => (
        <a
          key={key}
          href={href}
          target={self ? "_self" : "_blank"}
          rel={self ? undefined : "noopener noreferrer"}
          className="social-link"
        >
          {icon}
        </a>
      ))}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="w-full py-3 mb-8 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex items-center min-w-0">
          <Link
            href="/"
            className={`text-3xl font-semibold nav-title${pathname === "/" ? " nav-active" : ""}`}
          >
            {metaData.title}
          </Link>
        </div>
        <div className="flex flex-row items-center gap-4">
          {Object.entries(navItems).map(([path, { name }]) => (
            <Link
              key={path}
              href={path}
              className={`nav-link${pathname === path ? " nav-active" : ""}`}
            >
              {name}
            </Link>
          ))}
          <div className="mx-2"><SocialLinks /></div>
          <ThemeSwitch />
        </div>
      </div>
    </nav>
  );
}
