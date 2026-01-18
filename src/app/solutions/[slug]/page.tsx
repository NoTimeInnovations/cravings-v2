import React from "react";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { SolutionsHero } from "@/components/solutions/SolutionsHero";
import { SolutionsBenefits } from "@/components/solutions/SolutionsBenefits";
import { SolutionsFeatures } from "@/components/solutions/SolutionsFeatures";
import { FAQSection, CTASection } from "@/components/product/PageSections";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";

// Helper to get data for a specific solution slug
async function getSolutionData(slug: string) {
    const contentDir = path.join(process.cwd(), "src/content/solutions");
    const filePath = path.join(contentDir, `${slug}.json`);

    try {
        const fileContents = fs.readFileSync(filePath, "utf8");
        return JSON.parse(fileContents);
    } catch (error) {
        return null;
    }
}

// Generate static params for SSG
export async function generateStaticParams() {
    const contentDir = path.join(process.cwd(), "src/content/solutions");
    try {
        const files = fs.readdirSync(contentDir);
        return files
            .filter((file) => file.endsWith(".json"))
            .map((file) => ({
                slug: file.replace(".json", ""),
            }));
    } catch (e) {
        return [];
    }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const data = await getSolutionData(slug);

    if (!data) {
        return {
            title: "Solution Not Found | Cravings"
        }
    }

    return {
        title: `${data.hero.eyebrow} Solutions - Cravings`,
        description: data.hero.subheadline
    }
}

export default async function SolutionPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const data = await getSolutionData(slug);

    if (!data) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navbar is strictly handled by root layout */}

            <main>
                <SolutionsHero data={data.hero} />
                <SolutionsBenefits benefits={data.benefits} />
                <SolutionsFeatures features={data.features} />

                {/* FAQ Section */}
                {data.faq && <FAQSection items={data.faq} />}


                {data.cta && <CTASection data={data.cta} />}
            </main>

            <Footer />

            {/* Chatwoot Chat Bubble */}
            <Chatwoot />
        </div>
    );
}

