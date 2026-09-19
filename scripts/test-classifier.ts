import { analyzeIssueContext } from "../lib/issueClassifier";

interface TestCase {
  id: number;
  text: string;
  expectedCategory: string | string[];
  expectedSecondary?: string[];
  expectedImpactsIncludes?: string[];
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    text: "The food quality is very poor and contaminated food is making people sick.",
    expectedCategory: ["Food Safety", "Health & Hygiene"],
    description: "Poor food quality with illness as impact",
  },
  {
    id: 2,
    text: "Dirty water is causing diarrhea in our village.",
    expectedCategory: "Water & Sanitation",
    expectedImpactsIncludes: ["diarrhea"],
    description: "Dirty water root cause with diarrhea as impact",
  },
  {
    id: 3,
    text: "Garbage is not collected and mosquitoes are increasing.",
    expectedCategory: ["Waste Management", "Sanitation"],
    expectedImpactsIncludes: ["mosquito"],
    description: "Garbage collection root cause with mosquitoes as impact",
  },
  {
    id: 4,
    text: "There is no doctor in our village.",
    expectedCategory: "Healthcare",
    description: "Direct healthcare service deficiency (no doctor)",
  },
  {
    id: 5,
    text: "The hospital has no medicines.",
    expectedCategory: "Healthcare",
    description: "Direct healthcare medicine shortage",
  },
  {
    id: 6,
    text: "The road is broken and ambulances cannot reach the village.",
    expectedCategory: ["Roads & Infrastructure", "Roads & Transport"],
    expectedImpactsIncludes: ["ambulance"],
    description: "Broken road root cause with ambulance access as impact",
  },
  {
    id: 7,
    text: "School food is stale and children are becoming sick.",
    expectedCategory: "Food Safety",
    description: "Stale school food with children becoming sick as impact",
  },
  {
    id: 8,
    text: "There is no clean drinking water near our school.",
    expectedCategory: "Water & Sanitation",
    description: "Direct clean drinking water deficiency",
  },
  {
    id: 9,
    text: "Garbage near the market is causing bad smell and illness.",
    expectedCategory: ["Waste Management", "Sanitation"],
    description: "Garbage near market causing bad smell and illness",
  },
  {
    id: 10,
    text: "Our village has no water and no garbage collection.",
    expectedCategory: "Water & Sanitation",
    expectedSecondary: ["Waste Management"],
    description: "Multi-issue compound complaint: Water + Waste Management",
  },

  // Extra prompt specific and multilingual test cases:
  {
    id: 11,
    text: "The food quality in our area is very poor and contaminated food is causing malaria and typhoid.",
    expectedCategory: ["Food Safety", "Health & Hygiene"],
    description: "Original prompt example: Food quality root issue with malaria/typhoid impact",
  },
  {
    id: 12,
    text: "The garbage dump near our houses is causing dengue.",
    expectedCategory: ["Waste Management", "Sanitation"],
    description: "Prompt example: Open garbage dump causing dengue (NOT Healthcare)",
  },
  {
    id: 13,
    text: "The drinking water is contaminated and many people are getting sick.",
    expectedCategory: "Water & Sanitation",
    description: "Prompt example: Drinking water contaminated with illness as impact",
  },
  {
    id: 14,
    text: "The government hospital has no medicines and patients are suffering.",
    expectedCategory: "Healthcare",
    description: "Prompt example: Hospital medicine shortage with patient suffering as impact",
  },
  {
    id: 15,
    text: "कचरा जमा होने के कारण डेंगू फैल रहा है।",
    expectedCategory: ["Waste Management", "Sanitation"],
    description: "Hindi: Garbage pile causing dengue",
  },
  {
    id: 16,
    text: "ଗାଁରେ ପିଇବା ପାଣି ଦୂଷିତ ଅଛି ଏବଂ ଝାଡାବାନ୍ତି ବ୍ୟାପୁଛି।",
    expectedCategory: "Water & Sanitation",
    description: "Odia: Contaminated drinking water causing diarrhea/vomiting",
  },
  {
    id: 17,
    text: "ଆମ ଗାଁରେ ଡାକ୍ତର ନାହାନ୍ତି ଏବଂ ଲୋକ ଚିକିତ୍ସା ପାଉନାହାନ୍ତି।",
    expectedCategory: "Healthcare",
    description: "Odia: No doctor in village with treatment lack as impact",
  },
  {
    id: 18,
    text: "हमारे गाँव में न पीने का पानी है और न ही कचरा उठाया जाता है।",
    expectedCategory: "Water & Sanitation",
    expectedSecondary: ["Waste Management"],
    description: "Hindi multi-issue: Drinking water deficiency + uncollected waste",
  },
];

console.log("==========================================================================");
console.log("PEOPLE'S PRIORITIES: CONTEXT-AWARE ISSUE CLASSIFICATION VERIFICATION");
console.log("==========================================================================\n");

let passedCount = 0;

TEST_CASES.forEach((tc) => {
  const res = analyzeIssueContext(tc.text);

  const acceptable = Array.isArray(tc.expectedCategory)
    ? tc.expectedCategory
    : [tc.expectedCategory];

  const categoryMatch = acceptable.includes(res.primaryCategory);
  let secondaryMatch = true;
  if (tc.expectedSecondary) {
    secondaryMatch = tc.expectedSecondary.some((sec) =>
      res.secondaryCategories.includes(sec as any)
    );
  }

  const passed = categoryMatch && secondaryMatch;
  if (passed) passedCount++;

  console.log(`[Test #${tc.id}] ${tc.description}`);
  console.log(`  Input: "${tc.text}"`);
  console.log(`  -> Primary Category: ${res.primaryCategory} ${categoryMatch ? "✓" : "✗ (Expected: " + acceptable.join(" / ") + ")"}`);
  if (res.secondaryCategories.length > 0) {
    console.log(`  -> Secondary Categories: ${res.secondaryCategories.join(", ")} ${secondaryMatch ? "✓" : "✗"}`);
  }
  console.log(`  -> Theme: ${res.theme}`);
  console.log(`  -> Root Issues: ${res.rootIssues.join("; ")}`);
  console.log(`  -> Impacts: ${res.impacts.join("; ")}`);
  console.log(`  -> Confidence: ${Math.round(res.confidence * 100)}%`);
  console.log(`  -> Reason: ${res.reason}`);
  console.log(`  Status: ${passed ? "PASSED" : "FAILED"}\n`);
});

console.log("==========================================================================");
console.log(`RESULTS: ${passedCount} / ${TEST_CASES.length} TESTS PASSED`);
console.log("==========================================================================");

if (passedCount < TEST_CASES.length) {
  process.exit(1);
} else {
  console.log("ALL 18 CONTEXT-AWARE TEST CASES PASSED PERFECTLY!");
}
