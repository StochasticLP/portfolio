import Link from "next/link";
import Image from "next/image";
import { formatDate, getBlogPosts } from "app/lib/posts";

export const metadata = {
  title: "Blog",
  description: "Nextfolio Blog",
};

export default function BlogPosts() {
  let allBlogs = getBlogPosts();

  return (
    <section className="mx-auto mt-12 w-full px-4 md:w-3/5">
      <h1 className="mb-12 text-3xl font-medium tracking-tighter text-[var(--text-primary)]">Our Blog</h1>
      <div className="flex flex-col">
        {allBlogs
          .sort((a, b) => {
            if (
              new Date(a.metadata.publishedAt) >
              new Date(b.metadata.publishedAt)
            ) {
              return -1;
            }
            return 1;
          })
          .map((post, index) => (
            <div key={post.slug} className="flex flex-col">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex w-full flex-col gap-6 md:flex-row md:items-stretch"
              >
                {/* Image Container */}
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] md:w-1/3">
                  {post.metadata.image ? (
                    <Image
                      src={post.metadata.image}
                      alt={post.metadata.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                      <span className="text-neutral-400">No Image</span>
                    </div>
                  )}
                </div>

                {/* Content Container */}
                <div className="relative flex grow flex-col justify-start md:w-2/3">
                  <div className="flex flex-col items-center">
                    <h2 className="mb-3 text-xl font-medium text-[var(--text-primary)]">
                      {post.metadata.title}
                    </h2>
                    <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)]">
                      {post.metadata.summary}
                    </p>
                  </div>

                  {/* Date in bottom right */}
                  <div className="mt-auto flex w-full justify-end pt-4">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">
                      {formatDate(post.metadata.publishedAt, false)}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Dividing Line */}
              {index < allBlogs.length - 1 && (
                <div className="my-10 h-px w-full bg-[var(--border-color)]" />
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
