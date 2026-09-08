import { database } from "@repo/database";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { FaqTable } from "./components/faq-table";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions shown on the storefront.",
};

const FaqsPage = async () => {
  const faqs = await database.faqs.findMany({
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });

  return (
    <>
      <Header page="FAQ" pages={["Content"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <FaqTable
          faqs={faqs.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            sort_order: faq.sort_order,
            is_active: faq.is_active,
          }))}
        />
      </div>
    </>
  );
};

export default FaqsPage;
