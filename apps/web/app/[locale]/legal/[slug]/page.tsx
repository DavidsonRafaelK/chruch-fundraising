import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { createStoreMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLegalDocument } from "@/lib/legal";

interface LegalPageProperties {
  readonly params: Promise<{
    slug: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: LegalPageProperties): Promise<Metadata> => {
  const { slug } = await params;
  const document = await getLegalDocument(slug);

  if (!document) {
    return {};
  }

  return createStoreMetadata({
    title: document.title,
    description: document.description,
  });
};

const LegalPage = async ({ params }: LegalPageProperties) => {
  const { slug } = await params;
  const document = await getLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <div className="container max-w-5xl py-16">
      <Link
        className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm focus:underline focus:outline-none"
        href="/"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Home
      </Link>
      <h1 className="scroll-m-20 text-balance font-extrabold text-4xl tracking-tight lg:text-5xl">
        {document.title}
      </h1>
      {document.description && (
        <p className="text-balance leading-7 [&:not(:first-child)]:mt-6">
          {document.description}
        </p>
      )}
      <div className="prose prose-neutral dark:prose-invert mt-16 whitespace-pre-wrap">
        {document.body}
      </div>
    </div>
  );
};

export default LegalPage;
