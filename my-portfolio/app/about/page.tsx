import React from "react";
import type { Metadata } from "next";
import path from "path";
import { readMDXFile } from "app/lib/posts";
import { CustomMDX } from "app/components/mdx";

export const metadata: Metadata = {
  title: "About",
  description: "About Me",
};

export default function About() {
  const { content } = readMDXFile(path.join(process.cwd(), "content", "about.mdx"));

  return (
    <section className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-justify">
      <CustomMDX source={content} />
    </section>
  );
}


