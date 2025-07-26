"use client";

import React from "react";
import { TbMailFilled } from "react-icons/tb";
import { metaData, socialLinks } from "app/lib/config";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="w-full flex flex-col items-center justify-center lg:mt-24 mt-16 pb-4">
      <div className="flex flex-col items-center w-full">
        <div className="text-center text-[#1C1C1C] dark:text-[#D4D4D4] text-sm">
          <time>© {YEAR}</time> {metaData.title}
        </div>
        <div className="mt-2">
        </div>
      </div>
    </footer>
  );
}
