import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { projects } from "./project-data";

export const metadata: Metadata = {
  title: "Projects",
  description: "Nextfolio Projects",
};

export default function Projects() {
  return (
    <section className="mx-auto mt-12 w-full px-4 md:w-3/5">
      <h1 className="mb-12 text-3xl font-medium tracking-tighter text-[var(--text-primary)]">Projects</h1>
      <div className="flex flex-col">
        {projects.map((project, index) => (
          <div key={index} className="flex flex-col">
            <Link
              href={project.url}
              className="group flex w-full flex-col gap-6 md:flex-row md:items-stretch"
            >
              {/* Image Container */}
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] md:w-1/3">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Content Container */}
              <div className="relative flex grow flex-col justify-start md:w-2/3">
                <div className="flex flex-col items-center">
                  <h2 className="mb-3 text-xl font-medium text-[var(--text-primary)]">
                    {project.title}
                  </h2>
                  <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)]">
                    {project.description}
                  </p>
                </div>

                {/* Date in bottom right */}
                <div className="mt-auto flex w-full justify-end pt-4">
                  <span className="text-xs text-[var(--text-secondary)] opacity-70">
                    {project.date}
                  </span>
                </div>
              </div>
            </Link>

            {/* Dividing Line */}
            {index < projects.length - 1 && (
              <div className="my-10 h-px w-full bg-[var(--border-color)]" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
