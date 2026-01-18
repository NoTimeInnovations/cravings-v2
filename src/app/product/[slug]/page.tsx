import React from "react";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/product/HeroSection";
import { FeatureSection } from "@/components/product/FeatureSection";
import { FAQSection, CTASection } from "@/components/product/PageSections";
import { ClientReviewsSection } from "@/components/product/ClientReviewsSection";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import Chatwoot from "@/components/Chatwoot";

// Helper to get data for a specific slug
async function getProductData(slug: string) {
    const contentDir = path.join(process.cwd(), "src/content");
    const filePath = path.join(contentDir, `${slug}.json`);

    try {
        const fileContents = fs.readFileSync(filePath, "utf8");
        return JSON.parse(fileContents);
    } catch (error) {
        return null;
    }
}

// Generate static params if you want SSG (optional, but good for SEO)
export async function generateStaticParams() {
    const contentDir = path.join(process.cwd(), "src/content");
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
    const data = await getProductData(slug);

    if (!data) {
        return {
            title: "Product Not Found | Cravings"
        }
    }

    return {
        title: `${data.hero.eyebrow} - Cravings`,
        description: data.hero.subheadline
    }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const data = await getProductData(slug);

    if (!data) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navbar is strictly handled by root layout or manual import if needed.
                Assuming RootLayout handles it for now as per previous context. 
             */}

            <main>
                <HeroSection data={data.hero} />
                <FeatureSection features={data.features} />
                {data.reviews && <ClientReviewsSection reviews={data.reviews} />}
                {data.faq && <FAQSection items={data.faq} />}
                {data.cta && <CTASection data={data.cta} />}
            </main>

            <Footer />

            {/* Chatwoot Chat Bubble */}
            <Chatwoot />
        </div>
    );
}

