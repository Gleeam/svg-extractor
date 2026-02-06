import { setRequestLocale } from "next-intl/server";
import { SvgExtractor } from "@/components/svg-extractor";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SvgExtractor />;
}
