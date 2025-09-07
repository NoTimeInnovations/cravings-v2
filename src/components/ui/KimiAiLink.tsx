import { toast } from "sonner";

interface KimiAiLinkProps {
  className?: string;
}

export function KimiAiLink({ className = "" }: KimiAiLinkProps) {
  const handleClick = async () => {
    if (!document.hasFocus()) {
      window.focus();
    }
    navigator.clipboard.writeText(
      `You are an expert in extracting structured data from restaurant menu images. Your task is to extract each dish along with its variant (e.g., Quarter, Half, Full) as separate items.
            
            - The main heading in the image (e.g., AL FAHAM) should be used as the category.
            - The description should describe the item based on its name and size. Example: "A full portion of Al Faham Honey-flavored grilled chicken."
            - The price must be the correct number (ignore struck-through or older prices if new prices are written nearby if price is not given give price as 1).
            - Format your response as a JSON array only, with each object in this format:
            - variants should be included as an array of objects with "name" and "price" properties.
            - variants should be arranged in ascending order of price.
            - If has varaiants the price of the item should be the minimum price of the variant.
            - If no variants are present, the item should not have a "variants" field.
            - prices should be in numbers and if no price is given then give the price as 1.
            - Example of the variants are (Qtr , Half, Full, Large, Small, Regular, etc.)
            {
              "name": string,
              "price": number,
              "description": string,
              "category": string,
              "variants": array of objects with "name" and "price" properties
            }`
    );
    toast.success("Prompt copied to clipboard!");
    window.open("https://aistudio.google.com/prompts/new_chat", "_blank");
  };

  return (
    <div
      onClick={handleClick}
      className={`underline text-sm py-2 text-blue-500 hover:text-blue-600 block text-right ${className}`}
    >
      Go to Gemini PRO {"(prompt is copied to clipboard)"} {"->"}
    </div>
  );
}
