"use client";
import React from 'react';
import { GoogleGenerativeAI, Schema ,  } from "@google/generative-ai";

// --- Best Practice: Get the API key from environment variables ---
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Check if the API key is available
if (!API_KEY) {
  throw new Error("Missing Google Gemini API key. Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Define a type for menu items for better type safety
interface MenuItem {
    name: string;
    price: number;
    description: string;
    category: string;
    image? : string;
    variants?: { name: string; price: number }[];
}


const page = () => {
    // State to hold multiple base64 image strings for preview
    const [images, setImages] = React.useState<string[]>([]);
    // State to hold multiple file objects for the API
    const [imageFiles, setImageFiles] = React.useState<File[]>([]);
    // State for the single, combined JSON response string from Gemini
    const [jsonResponse, setJsonResponse] = React.useState<string | null>(null);
    // State to handle loading status for Gemini
    const [loading, setLoading] = React.useState<boolean>(false);
    // State to handle any errors from Gemini
    const [error, setError] = React.useState<string | null>(null);

    // --- State for image generation and display ---
    const [menuItems, setMenuItems] = React.useState<MenuItem[] | null>(null);
    const [generatedImages, setGeneratedImages] = React.useState<{ [key: string]: string }>({});
    const [imageGenLoading, setImageGenLoading] = React.useState<boolean>(false);
    const [imageGenError, setImageGenError] = React.useState<string | null>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImageFiles(filesArray); 

            // Reset all previous results
            setJsonResponse(null);
            setError(null);
            setImages([]);
            setMenuItems(null);
            setGeneratedImages({});
            setImageGenError(null);

            const imagePromises = filesArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(imagePromises)
                .then(base64Images => setImages(base64Images))
                .catch(err => {
                    console.error("Error reading files:", err);
                    setError("Could not read one or more files.");
                });
        }
    };

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
        return { inlineData: { data: base64EncodedData, mimeType: file.type } };
    };

    const extractMenu = async () => {
        if (imageFiles.length === 0) {
            setError("Please upload one or more menu images first.");
            return;
        }

        setLoading(true);
        setJsonResponse(null);
        setError(null);
        setMenuItems(null);
        setGeneratedImages({});
        setImageGenError(null);

        try {
            // --- UPDATED: Use JSON Mode for a guaranteed clean JSON response ---
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema : {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                price: { type: "number" },
                                description: { type: "string" },
                                category: { type: "string" },
                                variants: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            price: { type: "number" }
                                        },
                                        required: ["name", "price"]
                                    }
                                }
                            },
                            required: ["name", "price", "description", "category"]
                        }
                    } as Schema
                },
            });

            const prompt = `
            You are an expert in extracting structured data from restaurant menu images.
            You will be given one or more images of a restaurant menu. Your task is to process all images and combine the extracted dishes into a single, final JSON array.

            Extraction rules:
            * Use the main heading in the image (for example, AL FAHAM) as the category.
            * For each dish like "Al Faham Normal", if there are size variants such as Quarter, Half, Full, group them under a single item using a "variants" array.
            * If a dish has variants, include the following fields: name, price (set to 1), description, category, and a "variants" array. Each element in "variants" should have a name (e.g., Quarter, Half, Full) and its corresponding price.
            * If a dish has no variants, include name, price, description, and category only. Do not include the "variants" field.
            * The description should briefly describe the item. For dishes with variants, the description should be general and cover all sizes. For single-size dishes, make the description specific to that item.
            * Use the correct price. Ignore struck-through or older prices if a newer one is written nearby. If a price is not available, set the price to 1.
            * Ensure consistency in formatting: Capitalize category and dish names properly. Use full words for sizes like Quarter, Half, Full.
            `;
            const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = result.response;
            
            // No need to clean the text anymore, JSON mode handles it!
            const text = response.text(); 

            console.log("Raw JSON response from Gemini:", text);
            
            
            setJsonResponse(text); // This will trigger the useEffect for image generation

        } catch (err) {
            console.error("Error extracting menu:", err);
            setError("Failed to extract menu from the image(s). Please check the console for details.");
        } finally {
            setLoading(false);
        }
    };

    // useEffect to handle image generation after JSON is received
    React.useEffect(() => {
        if (!jsonResponse) return;

        const generateImagesForMenu = async () => {
            setImageGenLoading(true);
            setImageGenError(null);
            setGeneratedImages({});
            
            try {
                const parsedData: MenuItem[] = JSON.parse(jsonResponse);
                console.log("Parsed menu items:", parsedData);
                setMenuItems(parsedData); 

                if (!Array.isArray(parsedData) || parsedData.length === 0) {
                    setImageGenError("No menu items were extracted to generate images for.");
                    return;
                }

                const apiResponse = await fetch('http://localhost:4000/api/image-gen/fullImages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedData),
                });
                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    throw new Error(`Image generation server responded with ${apiResponse.status}: ${errorText}`);
                }
                const imageData = await apiResponse.json();
                console.log(imageData);
                
                setGeneratedImages(imageData);
            } catch (err: any) {
                console.error("Error during image generation or JSON parsing:", err);
                if (err instanceof SyntaxError) {
                    setImageGenError("Failed to parse the JSON response from Gemini. The format is invalid.");
                    setMenuItems(null); 
                } else {
                    setImageGenError(`Failed to generate images. Ensure the server at http://localhost:4000 is running and accessible. Error: ${err.message}`);
                }
            } finally {
                setImageGenLoading(false);
            }
        };
        generateImagesForMenu();
    }, [jsonResponse]);


    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Menu Extractor & Imager</h1>
            <p>Upload one or more pages of a restaurant menu to extract items and generate images.</p>
            <input onChange={handleFileChange} type='file' name="menu" accept="image/*" multiple />
            {images.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Image Previews:</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {images.map((image, index) => (
                            <img key={index} src={image} alt={`Uploaded Menu Page ${index + 1}`} style={{ maxWidth: '200px', maxHeight: '300px', border: '1px solid #ccc', objectFit: 'contain' }} />
                        ))}
                    </div>
                </div>
            )}
            <button onClick={extractMenu} disabled={images.length === 0 || loading} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
                {loading ? 'Extracting...' : 'Extract Menu from Images'}
            </button>
            {error && <p style={{ color: 'red', marginTop: '20px' }}>Extraction Error: {error}</p>}
            <div style={{ marginTop: '30px' }}>
                {imageGenLoading && <h2>Generating item images...</h2>}
                {imageGenError && <p style={{ color: 'red', marginTop: '20px' }}>Image Generation Error: {imageGenError}</p>}
                {imageGenError && jsonResponse && !menuItems && (
                     <div style={{ marginTop: '20px' }}>
                        <h2>Raw (Invalid) JSON from Gemini:</h2>
                        <pre style={{ background: '#fdd', padding: '15px', borderRadius: '5px', border: '1px solid red' }}>
                            <code>{jsonResponse}</code>
                        </pre>
                    </div>
                )}
                {menuItems && menuItems.length > 0 && (
                    <div>
                        <h2>Extracted Menu Items & Generated Images</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {menuItems.map((item, index) => (
                                <div key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ flex: '1' }}>
                                        <h3 style={{ marginTop: 0 }}>{item.name}</h3>
                                        <p><strong>Category:</strong> {item.category}</p>
                                        <p><strong>Description:</strong> {item.description}</p>
                                        {item.variants ? (
                                            <div>
                                                <strong>Variants:</strong>
                                                <ul>{item.variants.map((variant, vIndex) => <li key={vIndex}>{variant.name}: ₹{variant.price}</li>)}</ul>
                                            </div>
                                        ) : (<p><strong>Price:</strong> ₹{item.price}</p>)}
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        {generatedImages[item.name] ? (
                                            <img src={generatedImages[item.name]} alt={item.name} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px' }}/>
                                        ) : (
                                            <div style={{ width: '150px', height: '150px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#888' }}>
                                                {imageGenLoading ? 'Loading...' : 'No Image'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default page;