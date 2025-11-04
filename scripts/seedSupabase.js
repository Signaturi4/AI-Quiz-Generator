const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { randomUUID } = require("crypto");
const dotenv = require("dotenv");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const VARIATIONS_PER_CERTIFICATION = 10;
const QUESTIONS_PER_VARIATION = 10;

const INVITATION_CODES = [
  // Static codes that always work (can be reused, never expire)
  {
    code: "SALES",
    role: "employee",
    category: "sales",
    notes: "Static sales invitation code (reusable, never expires)",
    expires_at: null,
    is_static: true,
  },
  {
    code: "HOSTESS",
    role: "employee",
    category: "hostess",
    notes: "Static hostess invitation code (reusable, never expires)",
    expires_at: null,
    is_static: true,
  },
  // Legacy codes (one-time use)
  {
    code: "NUANU-SALES-7G4XQ",
    role: "employee",
    category: "sales",
    notes: "Primary sales invitation",
  },
  {
    code: "NUANU-SALES-3P9LM",
    role: "employee",
    category: "sales",
    notes: "Secondary sales invitation",
  },
  {
    code: "NUANU-HOST-5T2VZ",
    role: "employee",
    category: "hostess",
    notes: "Hostess team onboarding",
  },
  {
    code: "NUANU-HOST-8K1JD",
    role: "employee",
    category: "hostess",
    notes: "Hostess backup code",
  },
  {
    code: "NUANU-ADMIN-4W6BY",
    role: "admin",
    category: "administrator",
    notes: "Administrator access code (manual provisioning)",
  },
];

function normalizeChoiceInput(choice) {
  if (typeof choice === "string") {
    return { text: choice };
  }
  if (choice && typeof choice === "object") {
    if (typeof choice.text === "string") {
      return { text: choice.text };
    }
    if ("text" in choice) {
      return { text: String(choice.text ?? "") };
    }
  }
  return { text: String(choice ?? "") };
}

function normalizeQuestionForInsert(question) {
  const normalizedChoices = Array.isArray(question?.choices)
    ? question.choices.map(normalizeChoiceInput)
    : [];

  const answerIndex =
    [question.answerIndex, question.answer_index, question.answer].find(
      (value) => typeof value === "number"
    ) ?? 0;

  const orderIndex = [question.orderIndex, question.order_index].find(
    (value) => typeof value === "number"
  );

  const tags = Array.isArray(question?.tags)
    ? question.tags
    : typeof question?.tags === "string"
    ? question.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : null;

  const explanation =
    question.explanation === undefined || question.explanation === null
      ? null
      : question.explanation;

  const difficulty =
    question.difficulty === undefined ||
    question.difficulty === null ||
    question.difficulty === ""
      ? null
      : question.difficulty;

  return {
    topic: question.topic ?? "general",
    prompt: question.prompt ?? "",
    choices: normalizedChoices,
    answerIndex,
    explanation,
    difficulty,
    tags,
    orderIndex: orderIndex ?? null,
  };
}

function buildQuestionVariations(
  baseQuestions,
  variationCount,
  questionsPerVariation
) {
  if (!Array.isArray(baseQuestions) || baseQuestions.length === 0) {
    throw new Error("Question bank must contain at least one question");
  }

  const normalizedBank = baseQuestions.map(normalizeQuestionForInsert);
  const variations = [];

  for (
    let variationIndex = 0;
    variationIndex < variationCount;
    variationIndex += 1
  ) {
    const variation = [];
    for (let offset = 0; offset < questionsPerVariation; offset += 1) {
      const index =
        (variationIndex * questionsPerVariation + offset) %
        normalizedBank.length;
      const source = normalizedBank[index];
      variation.push({
        ...source,
        choices: source.choices.map((choice) => ({ ...choice })),
      });
    }
    variations.push(variation);
  }
  return variations;
}

async function seedQuestionPoolVariations(poolId, baseQuestions, label) {
  const variationSets = buildQuestionVariations(
    baseQuestions,
    VARIATIONS_PER_CERTIFICATION,
    QUESTIONS_PER_VARIATION
  );

  for (let index = 0; index < variationSets.length; index += 1) {
    const versionNumber = index + 1;
    const version = await ensurePoolVersion(poolId, versionNumber);

    await adminClient
      .from("question_pool_versions")
      .update({
        status: "published",
        notes: `${label} variation #${versionNumber}`,
        published_at: version.published_at ?? new Date().toISOString(),
      })
      .eq("id", version.id);

    await replaceQuestions(version.id, variationSets[index]);
  }
}

const SALES_QUESTIONS = [
  {
    topic: "general",
    prompt: "What is Indonesia's global ranking by population?",
    choices: ["3rd", "4th", "5th", "6th"],
    answer: 1,
    explanation: "Indonesia is the world's fourth-most populous country.",
  },
  {
    topic: "general",
    prompt:
      "What is Indonesia's global ranking in terms of investment returns?",
    choices: ["Top 3", "Top 10", "Top 20", "Top 50"],
    answer: 1,
    explanation:
      "Indonesia routinely appears in the global top ten for investment returns.",
  },
  {
    topic: "market",
    prompt: "By what percentage has Bali land price increased since 2017?",
    choices: ["35%", "60%", "90%", "25%"],
    answer: 1,
    explanation: "Land values in Bali have climbed by roughly 60% since 2017.",
  },
  {
    topic: "market",
    prompt: "What is the average ROI on investments in Bali?",
    choices: ["5–8%", "8–10%", "10–13%", "15–20%"],
    answer: 2,
    explanation: "Average ROI for Bali investments sits in the 10–13% range.",
  },
  {
    topic: "projects",
    prompt: "What is the total area of Nuanu Creative City?",
    choices: ["24 hectares", "44 hectares", "64 hectares", "54 hectares"],
    answer: 1,
    explanation: "Nuanu Creative City spans approximately 44 hectares.",
  },
  {
    topic: "projects",
    prompt: "What percentage of Nuanu territory is designated as a green zone?",
    choices: ["25%", "40%", "51%", "70%"],
    answer: 3,
    explanation: "About 70% of Nuanu is preserved as green space.",
  },
  {
    topic: "projects",
    prompt: "What percentage is allocated to the Nuanu Social Fund?",
    choices: ["5%", "2%", "3%", "1%"],
    answer: 0,
    explanation:
      "Five percent of the project value is reserved for the Nuanu Social Fund.",
  },
  {
    topic: "projects",
    prompt: "Is there a school and kindergarten in Nuanu?",
    choices: ["Only school", "Only kindergarten", "Both", "Neither"],
    answer: 2,
    explanation: "Nuanu hosts both a school and a kindergarten on site.",
  },
  {
    topic: "culture",
    prompt: "What qualities should an NRE candidate possess?",
    choices: [
      "Reserved, quiet, analytical",
      "Communicative, professional, positive",
      "Aggressive and demanding",
      "Disorganized but creative",
    ],
    answer: 1,
    explanation:
      "Successful NRE hires are communicative, professional, and maintain a positive attitude.",
  },
  {
    topic: "projects",
    prompt: "Which of the following best describes Nuanu Creative City?",
    choices: [
      "A tech park",
      "A sustainable creative community",
      "A tourist resort",
      "A business center",
    ],
    answer: 1,
    explanation: "Nuanu is positioned as a sustainable creative community.",
  },
  {
    topic: "developers",
    prompt: "Which developer manages the X Hotel project?",
    choices: ["618 Development", "Baza", "Unit", "X Hotel Management"],
    answer: 3,
    explanation:
      "The X Hotel project is operated under its own management team.",
  },
  {
    topic: "projects",
    prompt: "Where is The Sens project located?",
    choices: ["Inside Nuanu City", "In Ubud", "Outside Nuanu", "Near Sanur"],
    answer: 2,
    explanation: "The Sens is situated just outside the Nuanu area.",
  },
  {
    topic: "products",
    prompt: "What type of property is offered in The Sens?",
    choices: ["Studios", "Apartments", "Villas", "All of the above"],
    answer: 3,
    explanation:
      "The Sens offers a mix of units including studios, apartments, and villas.",
  },
  {
    topic: "design",
    prompt: "What is the architectural style of Black Sands Oasis?",
    choices: [
      "Desert Modernism",
      "Minimalism",
      "Classic Balinese",
      "Tropical Colonial",
    ],
    answer: 0,
    explanation:
      "Black Sands Oasis showcases a Desert Modernism design language.",
  },
  {
    topic: "pricing",
    prompt: "What is the entry price for Ecoverse?",
    choices: ["$250K", "$186K", "$120K", "$150K"],
    answer: 1,
    explanation: "Ecoverse units start at approximately $186K.",
  },
  {
    topic: "location",
    prompt: "How far is Black Sands Oasis from the ocean?",
    choices: ["300 meters", "700 meters", "1 km", "3 km"],
    answer: 2,
    explanation:
      "The project is roughly one kilometer away from the shoreline.",
  },
  {
    topic: "districts",
    prompt: "Which project is located inside the Golden Mile district?",
    choices: ["Flower Estates", "The Sens", "Origins", "Black Sands Oasis"],
    answer: 0,
    explanation: "Flower Estates sits within Nuanu's Golden Mile district.",
  },
  {
    topic: "legal",
    prompt: "What is the leasehold period for Black Sands Oasis?",
    choices: ["25 years", "30 years", "35 years", "40 years"],
    answer: 2,
    explanation: "Black Sands Oasis is sold with a 35-year leasehold term.",
  },
  {
    topic: "roi",
    prompt: "Which project offers guaranteed ROI for 5 years?",
    choices: ["Baza Kedungu", "Biom", "618", "The Sens"],
    answer: 0,
    explanation: "Baza Kedungu includes a five-year ROI guarantee.",
  },
  {
    topic: "ownership",
    prompt: "Which project offers Freehold ownership?",
    choices: ["Flower Estates", "Black Sands Oasis", "Biom", "Baza Kedungu"],
    answer: 0,
    explanation: "Flower Estates provides freehold land titles.",
  },
  {
    topic: "developers",
    prompt: "Which developer is behind Black Sands Oasis?",
    choices: ["Biom", "Unit", "Baza", "OXO"],
    answer: 1,
    explanation: "Unit is the developer responsible for Black Sands Oasis.",
  },
  {
    topic: "design",
    prompt:
      "Which project is inspired by the architectural style of the movie Dune?",
    choices: ["Origins", "Biom", "Black Sands Oasis", "OXO"],
    answer: 0,
    explanation:
      "The Origins project draws heavily from the Dune desert aesthetic.",
  },
  {
    topic: "brand",
    prompt: "What is X Hotel known for?",
    choices: [
      "First experience-led hotel in Nuanu",
      "Studio apartments",
      "Desert design",
      "Eco villas",
    ],
    answer: 0,
    explanation:
      "X Hotel positions itself as Nuanu's first experience-led hospitality concept.",
  },
  {
    topic: "design",
    prompt: "Which project has the tallest ceilings (6 meters)?",
    choices: ["Black Sands Oasis", "Flower Estates", "ICON", "The Sens"],
    answer: 0,
    explanation:
      "Black Sands Oasis units are designed with six-meter ceiling heights.",
  },
  {
    topic: "developers",
    prompt: "Which developer is known for hi-tech minimalism?",
    choices: ["618 Development", "Biom", "UNIT.", "OXO"],
    answer: 0,
    explanation:
      "618 Development is associated with hi-tech minimalist architecture.",
  },
  {
    topic: "developers",
    prompt: "Which developer is behind Flower Estates?",
    choices: ["618", "Biom", "NPG", "OXO"],
    answer: 0,
    explanation: "Flower Estates is another 618 Development project.",
  },
  {
    topic: "roi",
    prompt: "Which project guarantees ROI?",
    choices: ["X Hotel", "The Sens", "Flower Estates", "Biom"],
    answer: 0,
    explanation: "X Hotel provides a revenue guarantee in its offer.",
  },
  {
    topic: "roi",
    prompt: "What is the typical ROI range for Nuanu projects?",
    choices: ["2–5%", "7–10%", "10–15%", "20–25%"],
    answer: 2,
    explanation:
      "Developers target ROI in the 10–15% bracket for Nuanu assets.",
  },
  {
    topic: "timeline",
    prompt: "Which property will be completed the soonest?",
    choices: [
      "Collection Vol.1",
      "Collection Vol.2",
      "Black Sands Oasis",
      "The Sens",
    ],
    answer: 0,
    explanation:
      "Collection Vol.1 is the nearest-term completion among active launches.",
  },
  {
    topic: "availability",
    prompt: "Which projects are currently for sale?",
    choices: [
      "Black Sands Oasis, The Sens, X Hotel",
      "Only Biom",
      "Only Baza Kedungu",
      "All completed projects",
    ],
    answer: 0,
    explanation:
      "Marketing is focused on Black Sands Oasis, The Sens, and X Hotel inventory.",
  },
  {
    topic: "product",
    prompt: "What is The Sens project?",
    choices: [
      "Spa center",
      "Luxury villas",
      "Apartments complex",
      "A turnkey resort",
    ],
    answer: 3,
    explanation: "The Sens is packaged as a turnkey resort investment.",
  },
  {
    topic: "crm",
    prompt: "How do you change a stage in a client's card?",
    choices: [
      "Click 'Edit Info'",
      "Drag the card to another column",
      "Use CRM settings",
      "Ask a manager",
    ],
    answer: 1,
    explanation:
      "Kommo stages are moved by dragging cards between pipeline columns.",
  },
  {
    topic: "crm",
    prompt: "How do you set a task in the client's card?",
    choices: [
      "Through Kommo task tab",
      "Send WhatsApp message",
      "Write in comments",
      "Add emoji",
    ],
    answer: 0,
    explanation:
      "Tasks are managed directly via the Kommo task tab inside each card.",
  },
  {
    topic: "crm",
    prompt: "What should be shown in the card name?",
    choices: [
      "Client's name + Phone number",
      "Only project name",
      "Country",
      "Manager name",
    ],
    answer: 0,
    explanation:
      "Naming convention pairs the client's name with their phone number for clarity.",
  },
];

const HOSTESS_QUESTIONS = [
  {
    topic: "general",
    prompt: "Where is Nuanu Creative City located?",
    choices: ["Thailand", "Ubud, Bali", "Tabanan, Bali", "Seminyak"],
    answer: 2,
    explanation: "Nuanu Creative City sits in the Tabanan area of Bali.",
  },
  {
    topic: "general",
    prompt: "What is the total area of Nuanu Creative City?",
    choices: ["24 hectares", "34 hectares", "44 hectares", "54 hectares"],
    answer: 2,
    explanation: "The Nuanu masterplan covers about 44 hectares.",
  },
  {
    topic: "sustainability",
    prompt: "What percentage of Nuanu is a green zone?",
    choices: ["25%", "70%", "65%", "80%"],
    answer: 1,
    explanation: "Seventy percent of the site is reserved as green land.",
  },
  {
    topic: "impact",
    prompt: "What percentage is allocated to the Nuanu Social Fund?",
    choices: ["1%", "2%", "3%", "5%"],
    answer: 3,
    explanation: "Five percent of revenues flow to the Nuanu Social Fund.",
  },
  {
    topic: "education",
    prompt: "Is there a school in Nuanu?",
    choices: ["No", "Yes", "Only kindergarten", "Only university"],
    answer: 1,
    explanation: "The community includes an operating school.",
  },
  {
    topic: "education",
    prompt: "Is there a kindergarten in Nuanu?",
    choices: ["No", "Yes", "Planned", "Inside the school"],
    answer: 1,
    explanation: "Families have access to an on-site kindergarten.",
  },
  {
    topic: "identity",
    prompt: "What makes Nuanu unique?",
    choices: [
      "Only residential area",
      "Mix of creativity, sustainability & community",
      "Focused only on tourism",
      "Remote eco-village",
    ],
    answer: 1,
    explanation:
      "Nuanu blends creative industries with sustainability and community living.",
  },
  {
    topic: "access",
    prompt: "How many gates or entrances does Nuanu have?",
    choices: ["1", "2", "3", "4"],
    answer: 2,
    explanation: "There are three official access gates to Nuanu.",
  },
  {
    topic: "location",
    prompt: "How far is Nuanu from Canggu?",
    choices: ["5 minutes", "15 minutes", "25 minutes", "1 hour"],
    answer: 1,
    explanation: "Travel time to Canggu is roughly fifteen minutes.",
  },
  {
    topic: "identity",
    prompt: "What type of city is Nuanu?",
    choices: ["Industrial", "Creative", "Financial", "Tech hub"],
    answer: 1,
    explanation: "Nuanu positions itself as a creative city.",
  },
  {
    topic: "nre",
    prompt: "What is NRE?",
    choices: [
      "A restaurant chain",
      "A real estate company",
      "A design studio",
      "An architecture bureau",
    ],
    answer: 1,
    explanation:
      "NRE stands for Nuanu Real Estate, the in-house sales organization.",
  },
  {
    topic: "nre",
    prompt: "What qualities should an NRE hostess have?",
    choices: [
      "Creative, disorganized",
      "Communicative, positive, professional",
      "Quiet and reserved",
      "Fast but careless",
    ],
    answer: 1,
    explanation:
      "Hostesses must communicate clearly, stay positive, and remain professional.",
  },
  {
    topic: "nre",
    prompt: "What is the main goal of NRE hostesses at the corner?",
    choices: [
      "To sell property directly",
      "To register and qualify leads",
      "To serve food and drinks",
      "To make social media posts",
    ],
    answer: 1,
    explanation:
      "Hostesses focus on capturing and qualifying leads for the sales team.",
  },
  {
    topic: "nre",
    prompt: "How does NRE support clients during the purchase process?",
    choices: [
      "Legal and administrative guidance",
      "No client support",
      "Only after sales",
      "Through external partners",
    ],
    answer: 0,
    explanation:
      "NRE guides buyers through legal and administrative steps internally.",
  },
  {
    topic: "nre",
    prompt: "What should a hostess always collect from the client?",
    choices: ["Email only", "Phone number", "Instagram", "Address"],
    answer: 1,
    explanation: "Collecting a phone number is critical for follow-up.",
  },
  {
    topic: "nre",
    prompt: "What happens after the hostess registers a lead?",
    choices: [
      "Lead disappears",
      "Sales manager contacts the client",
      "Client contacts the developer",
      "It goes to archive",
    ],
    answer: 1,
    explanation: "Registered leads are handed immediately to sales managers.",
  },
  {
    topic: "nre",
    prompt: "How does NRE cooperate with developers?",
    choices: [
      "Through official partnerships",
      "Independently without contracts",
      "Through government",
      "Only via agencies",
    ],
    answer: 0,
    explanation:
      "Developer relationships are managed via formal partnership agreements.",
  },
  {
    topic: "nre",
    prompt: "What makes NRE different from standard agencies?",
    choices: [
      "It sells only land",
      "It represents all Nuanu projects directly",
      "It has no agents",
      "It doesn't handle clients",
    ],
    answer: 1,
    explanation:
      "NRE exclusively represents every Nuanu project as a direct channel.",
  },
  {
    topic: "developers",
    prompt: "Which developer is known for Desert Modernism design?",
    choices: ["UNIT.", "Biom", "618 Development", "OXO Living"],
    answer: 0,
    explanation: "UNIT. is recognized for its Desert Modernism approach.",
  },
  {
    topic: "design",
    prompt:
      "Which project is inspired by the architectural style of the movie Dune?",
    choices: ["Origins", "Biom", "Black Sands Oasis", "OXO"],
    answer: 0,
    explanation: "Origins channels the cinematic style seen in Dune.",
  },
  {
    topic: "partners",
    prompt: "Which project has collaboration with Aurora Media Park?",
    choices: ["Black Sands Oasis", "The Sens", "ICON", "Baza Kedungu"],
    answer: 0,
    explanation:
      "Black Sands Oasis includes a partnership with Aurora Media Park.",
  },
  {
    topic: "developers",
    prompt: "Which developer has a factory producing steel and furniture?",
    choices: ["UNIT.", "Biom", "OXO", "618 Development"],
    answer: 0,
    explanation:
      "UNIT. operates its own fabrication facilities for steel and furniture.",
  },
  {
    topic: "districts",
    prompt: "Which project is located inside the Golden Mile district?",
    choices: ["Flower Estates", "The Sens", "Origins", "Black Sands Oasis"],
    answer: 0,
    explanation: "Flower Estates is positioned within the Golden Mile.",
  },
  {
    topic: "developers",
    prompt: "Which developer is known for hi-tech minimalism?",
    choices: ["618 Development", "Biom", "UNIT.", "OXO"],
    answer: 0,
    explanation:
      "618 Development brands itself with hi-tech minimalist design.",
  },
  {
    topic: "art",
    prompt: "Which project collaborates on the Stella Solaris art object?",
    choices: ["Black Sands Oasis", "X Hotel", "The Sens", "Flower Estates"],
    answer: 0,
    explanation:
      "Black Sands Oasis includes the Stella Solaris art commission.",
  },
  {
    topic: "projects",
    prompt: "Which project is part of Nuanu Creative City?",
    choices: ["The Sens", "OXO Canggu", "Bali Real Estate", "Nusa Villa"],
    answer: 0,
    explanation: "The Sens remains under the Nuanu Creative City umbrella.",
  },
  {
    topic: "developers",
    prompt: "Which developer built Flower Estate?",
    choices: ["Biom", "618 Development", "OXO", "NPG"],
    answer: 1,
    explanation: "618 Development delivered the Flower Estate project.",
  },
  {
    topic: "products",
    prompt: "What is Ecoverse known for?",
    choices: [
      "Eco-friendly, riverside design",
      "Desert modernism",
      "Urban minimalism",
      "Colonial style",
    ],
    answer: 0,
    explanation: "Ecoverse emphasizes eco-sensitive, riverside living.",
  },
  {
    topic: "partners",
    prompt: "Which developer works with OXO Living?",
    choices: ["618 Development", "Biom", "Unit", "NPG"],
    answer: 3,
    explanation: "NPG is the developer collaborating with OXO Living.",
  },
  {
    topic: "products",
    prompt: "What is the X Hotel project?",
    choices: [
      "Residential villas",
      "Boutique hotel concept",
      "Office building",
      "Sports complex",
    ],
    answer: 1,
    explanation:
      "X Hotel is a boutique, experience-driven hospitality concept.",
  },
  {
    topic: "products",
    prompt: "What is The Sens project?",
    choices: ["Spa center", "Luxury villas", "Apartments", "A turnkey resort"],
    answer: 3,
    explanation: "The Sens functions as a turnkey resort investment.",
  },
  {
    topic: "products",
    prompt: "What is the Black Sands Oasis project?",
    choices: [
      "Desert-modernism villa complex",
      "Student housing",
      "Co-working village",
      "Hostel area",
    ],
    answer: 0,
    explanation:
      "Black Sands Oasis is a villa community built in Desert Modernism style.",
  },
  {
    topic: "locations",
    prompt: "Which project has direct access to Aurora Park?",
    choices: ["Black Sands Oasis", "The Sens", "Flower Estates", "X Hotel"],
    answer: 0,
    explanation: "Black Sands Oasis residents connect directly to Aurora Park.",
  },
  {
    topic: "sales",
    prompt: "Which projects are currently for sale?",
    choices: [
      "Black Sands Oasis, The Sens, X Hotel",
      "Only Biom",
      "Only Baza Kedungu",
      "All completed projects",
    ],
    answer: 0,
    explanation:
      "Active listings include Black Sands Oasis, The Sens, and X Hotel.",
  },
  {
    topic: "design",
    prompt: "Which project is inspired by Dune architecture?",
    choices: ["Origins", "Biom", "The Sens", "Flower Estates"],
    answer: 0,
    explanation: "Origins uses the same design cues as the Dune film sets.",
  },
  {
    topic: "timeline",
    prompt: "Which property will be completed the soonest?",
    choices: [
      "Collection Vol.1",
      "Collection Vol.2",
      "Black Sands Oasis",
      "The Sens",
    ],
    answer: 0,
    explanation: "Collection Vol.1 has the nearest delivery date.",
  },
  {
    topic: "pricing",
    prompt: "What is the entry price for Black Sands Oasis studios?",
    choices: ["$50K", "$109K", "$120K", "$150K"],
    answer: 1,
    explanation: "Studios start at approximately $109K.",
  },
  {
    topic: "ownership",
    prompt: "Which projects offer Freehold ownership?",
    choices: ["Flower Estates", "Black Sands Oasis", "Biom", "Baza Kedungu"],
    answer: 0,
    explanation: "Freehold ownership is available at Flower Estates.",
  },
  {
    topic: "ownership",
    prompt: "Which projects offer Leasehold?",
    choices: [
      "Black Sands Oasis",
      "Flower Estates",
      "OXO The Residence",
      "OXO The Pavilions",
    ],
    answer: 0,
    explanation: "Black Sands Oasis is sold on a leasehold basis.",
  },
];

const USERS = [
  {
    email: "admin@nuanu.dev",
    password: "AdminPass123!",
    role: "admin",
    category: null,
    firstName: "Nuanu",
    lastName: "Admin",
  },
  {
    email: "sales.agent@nuanu.dev",
    password: "SalesPass123!",
    role: "employee",
    category: "sales",
    firstName: "Sales",
    lastName: "Agent",
  },
  {
    email: "hostess@nuanu.dev",
    password: "HostessPass123!",
    role: "employee",
    category: "hostess",
    firstName: "Hostess",
    lastName: "Team",
  },
];

async function ensureUser(user) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      role: user.role,
      category: user.category,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  if (!error) {
    return data.user;
  }

  if (
    error.code === "email_exists" ||
    (error.message &&
      error.message.toLowerCase().includes("already been registered")) ||
    (error.message &&
      error.message.toLowerCase().includes("already registered"))
  ) {
    const existing = await findUserByEmail(user.email);
    if (existing) return existing;
  }

  throw error;
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;
    if (!data?.users?.length) return null;

    const match = data.users.find((user) => user.email === email);
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertUserMetadata(userRecord, userMeta) {
  const payload = {
    id: userRecord.id,
    email: userRecord.email,
    first_name: userMeta.firstName ?? null,
    last_name: userMeta.lastName ?? null,
    role: userMeta.role,
    category: userMeta.category ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("users")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

async function seedInvitationCodes() {
  for (const entry of INVITATION_CODES) {
    const payload = {
      code: entry.code,
      role: entry.role,
      category: entry.category ?? null,
      notes: entry.notes ?? null,
      expires_at: entry.expires_at ?? null,
      // Static codes: keep existing used_at/used_by, or set to null if new
      // For static codes, we want to reset them to allow reuse
      used_at: entry.is_static ? null : undefined,
      used_by: entry.is_static ? null : undefined,
    };

    // For static codes, always reset used_at and used_by to allow reuse
    if (entry.is_static) {
      const { error: updateError } = await adminClient
        .from("invitation_codes")
        .upsert(
          {
            ...payload,
            used_at: null,
            used_by: null,
          },
          { onConflict: "code" }
        );
      
      if (updateError) throw updateError;
    } else {
      // For regular codes, only update if not exists
      const { error } = await adminClient
        .from("invitation_codes")
        .upsert(payload, { onConflict: "code" });

      if (error) throw error;
    }
  }
}

async function ensureQuestionPool(name, description) {
  const { data, error } = await adminClient
    .from("question_pools")
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await adminClient
    .from("question_pools")
    .insert({
      id: randomUUID(),
      name,
      description,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function ensurePoolVersion(poolId, versionNumber) {
  const { data, error } = await adminClient
    .from("question_pool_versions")
    .select("*")
    .eq("pool_id", poolId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await adminClient
    .from("question_pool_versions")
    .insert({
      id: randomUUID(),
      pool_id: poolId,
      version_number: versionNumber,
      status: "published",
      notes: null,
      created_by: null,
      published_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function replaceQuestions(versionId, questions) {
  const { error: deleteError } = await adminClient
    .from("questions")
    .delete()
    .eq("pool_version_id", versionId);

  if (deleteError) throw deleteError;

  const payload = questions.map((question, index) => {
    const normalized = normalizeQuestionForInsert(question);

    return {
      id: randomUUID(),
      pool_version_id: versionId,
      topic: normalized.topic,
      prompt: normalized.prompt,
      choices: normalized.choices,
      answer_index: normalized.answerIndex,
      explanation: normalized.explanation,
      difficulty: normalized.difficulty,
      tags: normalized.tags,
      order_index: normalized.orderIndex ?? index,
    };
  });

  const { error: insertError } = await adminClient
    .from("questions")
    .insert(payload);

  if (insertError) throw insertError;
}

async function ensureCertification({
  code,
  title,
  description,
  question_pool_id,
  passing_threshold,
  duration_minutes,
}) {
  const { data, error } = await adminClient
    .from("certifications")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await adminClient
    .from("certifications")
    .insert({
      id: randomUUID(),
      code,
      title,
      description,
      question_pool_id,
      passing_threshold,
      duration_minutes,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function ensureAssignment({ profile_id, certification_id }) {
  const { data, error } = await adminClient
    .from("assignments")
    .select("*")
    .eq("profile_id", profile_id)
    .eq("certification_id", certification_id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await adminClient
    .from("assignments")
    .insert({
      id: randomUUID(),
      profile_id,
      certification_id,
      status: "pending",
      assigned_at: new Date().toISOString(),
      next_eligible_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function main() {
  console.log("👷 Seeding Supabase data...");

  await seedInvitationCodes();
  console.log("✔️ seeded invitation codes");

  const users = [];

  for (const user of USERS) {
    const record = await ensureUser(user);
    await upsertUserMetadata(record, user);
    users.push({ ...record, meta: user });
    console.log(`✔️ ensured user ${user.email}`);
  }

  const salesPool = await ensureQuestionPool(
    "Sales Certification Pool",
    "Question bank for Nuanu sales certification"
  );
  await seedQuestionPoolVariations(salesPool.id, SALES_QUESTIONS, "Sales");
  console.log("✔️ seeded sales question variations");

  const hostessPool = await ensureQuestionPool(
    "Hostess Certification Pool",
    "Question bank for Nuanu hostess certification"
  );
  await seedQuestionPoolVariations(
    hostessPool.id,
    HOSTESS_QUESTIONS,
    "Hostess"
  );
  console.log("✔️ seeded hostess question variations");

  const salesCert = await ensureCertification({
    code: "sales-cert",
    title: "Sales Certification",
    description: "Certification for Nuanu sales representatives",
    question_pool_id: salesPool.id,
    passing_threshold: 0.7,
    duration_minutes: 30,
  });

  const hostessCert = await ensureCertification({
    code: "hostess-cert",
    title: "Hostess Certification",
    description: "Certification for Nuanu hostesses",
    question_pool_id: hostessPool.id,
    passing_threshold: 0.7,
    duration_minutes: 25,
  });

  const salesUser = users.find((u) => u.meta.category === "sales");
  if (salesUser) {
    await ensureAssignment({
      profile_id: salesUser.id,
      certification_id: salesCert.id,
    });
  }

  const hostessUser = users.find((u) => u.meta.category === "hostess");
  if (hostessUser) {
    await ensureAssignment({
      profile_id: hostessUser.id,
      certification_id: hostessCert.id,
    });
  }

  console.log("🎉 Supabase seed completed");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
}

module.exports = {
  buildQuestionVariations,
  seedQuestionPoolVariations,
  ensureQuestionPool,
  ensurePoolVersion,
  replaceQuestions,
  ensureCertification,
  ensureAssignment,
  adminClient,
  SALES_QUESTIONS,
  HOSTESS_QUESTIONS,
  VARIATIONS_PER_CERTIFICATION,
  QUESTIONS_PER_VARIATION,
  normalizeQuestionForInsert,
};
