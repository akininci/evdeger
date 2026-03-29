import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticleBySlug, getAllArticleSlugs } from "@/lib/articles";
import { articleContent } from "@/lib/article-content";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: {
      canonical: `https://evdeger.durinx.com/rehber/${slug}`,
    },
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      url: `https://evdeger.durinx.com/rehber/${slug}`,
      siteName: "EvDeğer",
      locale: "tr_TR",
      type: "article",
      publishedTime: article.date,
      authors: [article.author],
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.metaDescription,
      images: ["/og-image.png"],
    },
  };
}

// Simple markdown-to-JSX renderer for article content
function renderMarkdown(md: string) {
  const lines = md.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let tableHeaderParsed = false;
  let key = 0;

  function flushTable() {
    if (tableRows.length === 0) return;
    const headers = tableRows[0];
    const body = tableRows.slice(1);
    elements.push(
      <div key={key++} className="overflow-x-auto my-6">
        <table className="min-w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-3 text-slate-600 dark:text-slate-300"
                    dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    tableHeaderParsed = false;
  }

  function renderInline(text: string): string {
    return text
      .replace(
        /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g,
        '<a href="$2" class="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">$1</a>'
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-emerald-600 dark:text-emerald-400 hover:underline">$1</a>'
      )
      .replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="text-slate-800 dark:text-slate-100 font-semibold">$1</strong>'
      );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      // Skip separator rows
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        tableHeaderParsed = true;
        continue;
      }
      if (!inTable) {
        inTable = true;
      }
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (line.trim() === "") continue;

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4"
        >
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-3"
        >
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Unordered list
    if (line.trim().startsWith("- ")) {
      // Collect all consecutive list items
      const items: string[] = [line.trim().slice(2)];
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith("- ")
      ) {
        i++;
        items.push(lines[i].trim().slice(2));
      }
      elements.push(
        <ul key={key++} className="my-4 space-y-2 ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [line.trim().replace(/^\d+\.\s/, "")];
      while (
        i + 1 < lines.length &&
        /^\d+\.\s/.test(lines[i + 1].trim())
      ) {
        i++;
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
      }
      elements.push(
        <ol key={key++} className="my-4 space-y-2 ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                {idx + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={key++}
        className="text-slate-600 dark:text-slate-300 leading-relaxed my-4"
        dangerouslySetInnerHTML={{ __html: renderInline(line) }}
      />
    );
  }

  // Flush remaining table
  if (inTable) flushTable();

  return elements;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const content = articleContent[slug];

  if (!article || !content) {
    notFound();
  }

  // Related articles (exclude current)
  const relatedArticles = articles
    .filter((a) => a.slug !== slug)
    .slice(0, 3);

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    image: `https://evdeger.durinx.com${article.coverImage}`,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Organization",
      name: article.author,
      url: "https://evdeger.durinx.com",
    },
    publisher: {
      "@type": "Organization",
      name: "EvDeğer",
      url: "https://evdeger.durinx.com",
      logo: {
        "@type": "ImageObject",
        url: "https://evdeger.durinx.com/favicon-32x32.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://evdeger.durinx.com/rehber/${slug}`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: "https://evdeger.durinx.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Rehber",
          item: "https://evdeger.durinx.com/rehber",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: `https://evdeger.durinx.com/rehber/${slug}`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article Header */}
      <section className="bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 py-14 sm:py-18">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-2 text-sm text-white/50 mb-8 flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white/80 transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link
              href="/rehber"
              className="hover:text-white/80 transition-colors"
            >
              Rehber
            </Link>
            <span>/</span>
            <span className="text-white/80 font-medium line-clamp-1">
              {article.title}
            </span>
          </nav>

          {/* Category badge */}
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 mb-4">
            {article.category}
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {article.title}
          </h1>

          {/* Meta info */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
              <time dateTime={article.date}>
                {new Date(article.date).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              {article.readTime} okuma
            </span>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {renderMarkdown(content)}
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              İlgili Yazılar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((ra) => (
                <Link
                  key={ra.slug}
                  href={`/rehber/${ra.slug}`}
                  className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span className="text-xs text-slate-400">
                    {ra.readTime} okuma
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {ra.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {ra.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Evinizin Değerini Hemen Öğrenin
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Tamamen ücretsiz, kayıt gerektirmez. 81 ilde anında sonuç.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-xl hover:-translate-y-0.5"
          >
            🔍 Ücretsiz Değerleme Yap
          </Link>
        </div>
      </section>
    </>
  );
}
