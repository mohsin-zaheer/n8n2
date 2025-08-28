"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";
import { nanoid } from "nanoid";
import { NodeIcon } from "@/components/ui/node-icon";

const outcomes: { label: string; prompt: string }[] = [
  {
    label: "spend less time on email",
    prompt:
      "Categorize incoming emails, generate a daily summary, and send it at 5pm.",
  },
  {
    label: "get more leads from SEO",
    prompt:
      "Capture organic contact form submissions, enrich with Clearbit, add to HubSpot, and alert Slack.",
  },
  {
    label: "stay hyperinformed on a topic",
    prompt:
      "Watch RSS feeds for 'AI regulation', summarize daily, and post to Slack.",
  },
  {
    label: "sync sales leads to my CRM",
    prompt:
      "Parse new form fills, enrich with Clearbit, dedupe, and add to HubSpot with a Slack alert.",
  },
  {
    label: "get alerts for VIP customer tickets",
    prompt:
      "When a Zendesk ticket from VIP domains arrives, notify Slack, tag ticket, and create a follow-up task.",
  },
  {
    label: "post weekly changelogs",
    prompt:
      "Collect merged PR titles from GitHub, summarize, and post to Slack and Notion each Friday.",
  },
  {
    label: "back up invoices automatically",
    prompt:
      "When a new invoice PDF is emailed, save to Google Drive, rename, and log to a spreadsheet.",
  },
  {
    label: "track mentions on social",
    prompt:
      "Monitor Twitter mentions, classify sentiment, and post a daily digest to Slack.",
  },
  {
    label: "summarize NPS responses",
    prompt:
      "Collect NPS responses from Typeform, summarize themes by score, and email a weekly report.",
  },
];

// All landing page body text uses a single paragraph size
const PARAGRAPH_TEXT_CLASS = "text-base";

// Template categories with detailed prompts
const templateCategories: Record<string, Array<{label: string; prompt: string}>> = {
  content: [
    { label: "Blog post writer", prompt: "Write SEO-optimized blog posts on trending topics in our industry, include keywords research, meta descriptions, and publish to WordPress" },
    { label: "Social media scheduler", prompt: "Create and schedule social media posts across LinkedIn, Twitter, and Instagram based on our blog content, with optimal timing and hashtags" },
    { label: "Newsletter automation", prompt: "Generate weekly newsletters from our top content, segment audiences by engagement, and send personalized emails through Mailchimp" },
    { label: "Case study generator", prompt: "Transform customer success stories into detailed case studies with metrics, testimonials, and visual assets" },
    { label: "Content repurposing", prompt: "Automatically repurpose long-form content into Twitter threads, LinkedIn carousels, and Instagram posts" },
  ],
  llm: [
    { label: "FAQ schema markup", prompt: "Generate and implement FAQ schema markup for all pages to increase visibility in AI search results" },
    { label: "Structured data optimizer", prompt: "Create comprehensive structured data for products, services, and content to improve LLM understanding" },
    { label: "AI citation builder", prompt: "Build authoritative content that LLMs will cite as sources, with proper attribution and fact-checking" },
    { label: "Knowledge graph creator", prompt: "Generate knowledge graphs and entity relationships that AI systems can easily parse and reference" },
    { label: "LLM-friendly documentation", prompt: "Convert technical documentation into LLM-optimized formats with clear hierarchies and semantic markup" },
  ],
  video: [
    { label: "Product demo videos", prompt: "Create automated product demo videos from screenshots and feature descriptions, with voiceover and captions" },
    { label: "Video ad variants", prompt: "Generate multiple video ad variants for A/B testing across Facebook, YouTube, and TikTok platforms" },
    { label: "Testimonial videos", prompt: "Transform written testimonials into engaging video content with animations and background music" },
    { label: "Tutorial video series", prompt: "Produce step-by-step tutorial videos from documentation with screen recordings and annotations" },
    { label: "Social video clips", prompt: "Extract and optimize short video clips from webinars and long-form content for social media" },
  ],
  seo: [
    { label: "Keyword research pipeline", prompt: "Automate keyword research, competitor analysis, and content gap identification with monthly reporting" },
    { label: "Technical SEO auditor", prompt: "Run daily technical SEO audits checking Core Web Vitals, broken links, and indexation issues" },
    { label: "AI content optimizer", prompt: "Use AI to optimize existing content for featured snippets, People Also Ask, and voice search" },
    { label: "Link building outreach", prompt: "Automate link building outreach with personalized emails, follow-ups, and relationship tracking" },
    { label: "Local SEO manager", prompt: "Manage Google Business Profile, local citations, and review responses across multiple locations" },
  ],
  calls: [
    { label: "Lead qualification bot", prompt: "Qualify leads through conversational AI before scheduling calls, saving sales team time" },
    { label: "Calendar optimization", prompt: "Optimize meeting scheduling based on lead score, timezone, and sales rep availability" },
    { label: "Follow-up sequences", prompt: "Create intelligent follow-up sequences based on call outcomes and prospect engagement" },
    { label: "Meeting prep automation", prompt: "Automatically research prospects and prepare personalized talking points before each call" },
    { label: "Call recording analyzer", prompt: "Analyze call recordings for insights, objections, and action items with automated CRM updates" },
  ],
};

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoverPrompt, setHoverPrompt] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const disabled = prompt.trim().length === 0 || loading;
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const onUseExample = (e: string) => setPrompt(e);
  const pulseInputRing = () => {
    const el = inputWrapperRef.current;
    if (!el) return;
    el.classList.remove("pulse-emerald-ring");
    // force reflow to allow re-adding animation class
    void el.offsetWidth;
    el.classList.add("pulse-emerald-ring");
    window.setTimeout(() => {
      el.classList.remove("pulse-emerald-ring");
    }, 800);
  };
  const handleUseExample = (e: string) => {
    onUseExample(e);
    setHoverPrompt(null);
    pulseInputRing();
  };
  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!disabled) void onSubmit();
    }
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      // Check if user is authenticated
      if (!user) {
        // Generate a workflow session ID upfront
        const timestamp = Date.now();
        const random = nanoid(10);
        const workflowSessionId = `wf_${timestamp}_${random}`;

        // Generate a session token for anonymous user
        const sessionToken = `anon_${nanoid(16)}`;

        // Store the prompt data in the sessions table
        const tempPromptData = {
          prompt,
          workflowSessionId, // Store the workflow session ID
          returnUrl: `/workflow/${workflowSessionId}`,
          timestamp: new Date().toISOString(),
        };

        // Store in Supabase sessions table
        const { error: sessionError } = await supabase.from("sessions").insert({
          id: sessionToken,
          session_token: sessionToken,
          temp_prompt_data: tempPromptData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        });

        if (sessionError) {
          console.error("Failed to store session:", sessionError);
          throw new Error("Failed to save your workflow prompt");
        }

        // Store session data directly in localStorage for retrieval after auth
        localStorage.setItem("pending_workflow_session", JSON.stringify(tempPromptData));

        // Redirect to login page with the workflow session ID
        router.push(`/auth/login?returnUrl=/workflow/${workflowSessionId}`);
        return;
      }

      // User is authenticated, create workflow directly
      const res = await fetch("/api/workflow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Failed to create workflow");
      const data = await res.json();
      router.push(`/workflow/${data.sessionId}`);
    } catch (e: any) {
      setError(e.message || "Failed to create workflow. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 -z-10" style={{
        background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
      }} />
      <div className="min-h-[calc(100vh-60px)]">
        <section className="relative overflow-hidden pt-6 sm:pt-10 md:pt-14">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto card text-center p-10 sm:p-12 border border-white/20 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl">
              <div className="relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex justify-center">
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-pulse-slow">
                      <NodeIcon name="n8n" size="xl" />
                    </div>
                    {/* Cool pulse rings */}
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-400/30 animate-ping"></div>
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-400/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
                
                {/* Logo line that overlaps with n8n logo */}
                <div className="flex justify-center items-center gap-3 sm:gap-4 md:gap-5 -mt-6 px-4 opacity-60 grayscale">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8">
                    <NodeIcon name="slack" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8">
                    <NodeIcon name="hubspot" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8">
                    <NodeIcon name="googleDrive" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden sm:block">
                    <NodeIcon name="notion" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8">
                    <NodeIcon name="linkedin" size="md" />
                  </div>
                  {/* Space reserved for n8n pulse */}
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8"></div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8"></div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden sm:block">
                    <NodeIcon name="mailchimp" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden md:block">
                    <NodeIcon name="airtable" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden md:block">
                    <NodeIcon name="shopify" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden lg:block">
                    <NodeIcon name="dropbox" size="md" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 hidden lg:block">
                    <NodeIcon name="segment" size="md" />
                  </div>
                </div>
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Prompt your custom growth agent
              </h1>
              
              {/* Subtitle */}
              <p className="text-center text-base text-neutral-600 mt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <span className="font-medium">300+ integrations</span> seamlessly connect to build your growth agent
              </p>

              <div className="mt-6 text-left">
                <div
                  ref={inputWrapperRef}
                  className="group relative rounded-xl border border-neutral-200 bg-white/80 backdrop-blur-sm shadow-sm transition-spring ring-0 focus-within:ring-1 focus-within:ring-neutral-300"
                >
                  <Textarea
                    placeholder="e.g., Send a Slack message when a new GitHub issue is created"
                    value={hoverPrompt ?? prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={onKeyDown}
                    className={`min-h-[120px] w-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-base leading-relaxed placeholder-neutral-400`}
                  />
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    className="inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer px-6 py-3 text-base gap-2  bg-[rgb(27,200,140)] text-white border-white hover:bg-emerald-400 focus:ring-white"
                    onClick={onSubmit}
                    disabled={disabled || checkingAuth}
                  >
                    <i className="fa-solid fa-bolt icon-sm" />{" "}
                    {loading
                      ? checkingAuth
                        ? "Checking..."
                        : "Starting..."
                      : "Start"}
                  </Button>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-screen-lg mx-auto px-4">
            <div className="mt-8 mb-1 text-center">
              <span className="text-2xl font-bold text-white">
                Need an idea?
              </span>
            </div>
            <div className={`mb-4 text-center ${PARAGRAPH_TEXT_CLASS} font-medium tracking-wide text-white/90`}>
              Begin with our growth templates and customize it for your company&apos;s context
            </div>
            
            {/* Category Pills */}
            <div className="flex justify-center flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategory(selectedCategory === "content" ? "" : "content")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedCategory === "content" 
                    ? "bg-[rgb(26,26,26)] text-white shadow-[0_4px_12px_rgba(26,26,26,0.35)]" 
                    : "bg-[rgb(26,26,26)] text-white hover:bg-[rgb(40,40,40)]"
                }`}
              >
                <i className="fa-solid fa-pen-to-square text-current leading-none" />
                Content Generation
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === "llm" ? "" : "llm")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedCategory === "llm" 
                    ? "bg-[rgb(26,26,26)] text-white shadow-[0_4px_12px_rgba(26,26,26,0.35)]" 
                    : "bg-[rgb(26,26,26)] text-white hover:bg-[rgb(40,40,40)]"
                }`}
              >
                <i className="fa-solid fa-robot text-current leading-none" />
                Get Indexed by LLMs
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === "video" ? "" : "video")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedCategory === "video" 
                    ? "bg-[rgb(26,26,26)] text-white shadow-[0_4px_12px_rgba(26,26,26,0.35)]" 
                    : "bg-[rgb(26,26,26)] text-white hover:bg-[rgb(40,40,40)]"
                }`}
              >
                <i className="fa-solid fa-video text-current leading-none" />
                Video Ads
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === "seo" ? "" : "seo")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedCategory === "seo" 
                    ? "bg-[rgb(26,26,26)] text-white shadow-[0_4px_12px_rgba(26,26,26,0.35)]" 
                    : "bg-[rgb(26,26,26)] text-white hover:bg-[rgb(40,40,40)]"
                }`}
              >
                <i className="fa-solid fa-chart-line text-current leading-none" />
                AI SEO Blog
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === "calls" ? "" : "calls")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedCategory === "calls" 
                    ? "bg-[rgb(26,26,26)] text-white shadow-[0_4px_12px_rgba(26,26,26,0.35)]" 
                    : "bg-[rgb(26,26,26)] text-white hover:bg-[rgb(40,40,40)]"
                }`}
              >
                <i className="fa-solid fa-phone text-current leading-none" />
                Book More Calls
              </button>
            </div>
            
            {/* Sub-category Pills - Conditional render based on selected category */}
            <div className="my-5 grid grid-cols-1 sm:grid-cols-2 gap-2 mx-2 lg:flex lg:flex-wrap lg:justify-center lg:gap-1.5">
              {templateCategories[selectedCategory]?.map((template) => (
                <button
                  key={template.label}
                  onClick={() => handleUseExample(template.prompt)}
                  onMouseEnter={() => setHoverPrompt(template.prompt)}
                  onMouseLeave={() => setHoverPrompt(null)}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-[rgb(26,26,26)] border border-neutral-200 transition-all hover:bg-neutral-50 hover:-translate-y-0.5 hover:shadow-md px-3 text-xs sm:px-4 py-2 sm:text-sm font-normal"
                  type="button"
                  aria-label={`Use template: ${template.label}`}
                >
                  <i className={`fa-solid ${
                    selectedCategory === "content" ? "fa-pen-to-square" :
                    selectedCategory === "llm" ? "fa-robot" :
                    selectedCategory === "video" ? "fa-video" :
                    selectedCategory === "seo" ? "fa-chart-line" :
                    selectedCategory === "calls" ? "fa-phone" :
                    "fa-wand-magic-sparkles"
                  } text-current leading-none`} />
                  <span className="text-left">{template.label}</span>
                </button>
              ))}
            </div>

          </div>
        </section>
      </div>
    </>
  );
}
