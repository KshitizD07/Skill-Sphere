// server/list_models.js
const API_KEY = "AIzaSyAeGe7G_knltW5gVdOCZFWP-f74vmTYLBY"; // 👈 Paste your working key here

async function listMyModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  console.log("📋 FETCHING AVAILABLE MODELS...");

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log("\n✅ YOU HAVE ACCESS TO THESE MODELS:");
      console.log("-----------------------------------");
      data.models.forEach(m => {
        // We only care about models that support 'generateContent'
        if (m.supportedGenerationMethods.includes("generateContent")) {
            console.log(`🔹 ${m.name.replace('models/', '')}`);
        }
      });
      console.log("-----------------------------------");
    } else {
      console.log("❌ NO MODELS FOUND. ERROR:", data);
    }
  } catch (error) {
    console.log("❌ NETWORK ERROR:", error.message);
  }
}

listMyModels();