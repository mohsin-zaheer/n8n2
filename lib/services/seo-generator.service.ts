// lib/services/seo-generator.service.ts

import { Anthropic } from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/config/anthropic";
import { createServerClient } from "@/lib/config/supabase";
import { DiscoveredNode } from "@/types/workflow";
import { WorkflowSEOMetadata } from "@/types/seo";
import { loggers } from "@/lib/utils/logger";
import { loadCategories, getTopLevelCategories, getSubcategories } from "@/lib/services/category-helper.service";

const logger = loggers.seo;

/**
 * SEO Generator Service
 * Generates business-focused SEO metadata for workflows using Claude
 * Uses prefill technique for reliable JSON output
 */
export class SEOGeneratorService {
  private anthropic: Anthropic;
  private categoriesLoaded: boolean = false;

  constructor() {
    this.anthropic = createAnthropicClient();
    // Load categories on initialization
    this.initializeCategories();
  }

  /**
   * Initialize categories from Supabase
   */
  private async initializeCategories(): Promise<void> {
    try {
      logger.info("📦 Loading categories from Supabase...");
      const categories = await loadCategories();
      this.categoriesLoaded = true;
      logger.info("✅ Categories loaded successfully for SEO generation", {
        totalCategories: categories.size,
        topLevelCategories: getTopLevelCategories().length,
      });
    } catch (error) {
      logger.error("❌ Failed to load categories", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Generate SEO metadata for a workflow based on discovered nodes
   * Uses Claude with prefill to ensure valid JSON response
   */
  async generateSEO(
    nodes: DiscoveredNode[],
    selectedIds: string[],
    userPrompt: string,
    sessionId: string
  ): Promise<WorkflowSEOMetadata> {
    const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));

    if (selectedNodes.length === 0) {
      return this.generateDefaultSEO(userPrompt, sessionId);
    }

    try {
      const systemPrompt = await this.buildSystemPrompt();
      const userMessage = this.buildUserMessage(userPrompt, selectedNodes);

      logger.info("🔍 SEO Generation Started", {
        sessionId,
        nodeCount: selectedNodes.length,
        selectedNodeTypes: selectedNodes.map(n => n.type),
        userPrompt: userPrompt,
      });

      logger.info("📝 System Prompt", {
        sessionId,
        systemPromptLength: systemPrompt.length,
        systemPromptPreview: systemPrompt.substring(0, 500) + "...",
      });

      logger.info("💬 User Message", {
        sessionId,
        userMessage,
      });

      logger.info("🤖 Calling Claude API", {
        sessionId,
        model: "claude-3-haiku-20240307",
        maxTokens: 500,
        temperature: 0.3,
      });

      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Fast and cost-effective for structured data
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for consistency
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
          {
            role: "assistant",
            content: '{\n  "slug": "', // Prefill to ensure JSON response with required fields
          },
        ],
      });

      logger.info("✅ Claude API Response Received", {
        sessionId,
        responseType: response.content[0]?.type,
        stopReason: response.stop_reason,
        usage: response.usage,
      });

      // Extract concatenated text blocks safely
      const textBlocks = response.content
        .filter((b: any) => b && b.type === "text")
        .map((b: any) => b.text as string)
        .join("");

      // Complete the JSON with the prefilled opening
      const jsonString = '{\n  "slug": "' + textBlocks;

      logger.info("📄 Raw JSON Response", {
        sessionId,
        jsonStringLength: jsonString.length,
        jsonString: jsonString.substring(0, 1000),
      });

      const seoData = this.parseAndValidateSEO(jsonString, sessionId);

      logger.info("✨ SEO metadata generated successfully", {
        sessionId,
        slug: seoData.slug,
        title: seoData.title,
        category: seoData.category,
        category_id: seoData.category_id,
        subcategory_id: seoData.subcategory_id,
        businessValue: seoData.businessValue,
        keywordsCount: seoData.keywords?.length,
        integrationsCount: seoData.integrations?.length,
      });

      return seoData;
    } catch (error) {
      logger.error("❌ Failed to generate SEO metadata - Using fallback", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      // Fallback to deterministic generation
      logger.info("🔄 Using fallback SEO generation", {
        sessionId,
        reason: "AI generation failed",
      });
      
      return this.generateFallbackSEO(selectedNodes, userPrompt, sessionId);
    }
  }

  /**
   * Build the system prompt for Claude with dynamic categories
   */
  private async buildSystemPrompt(): Promise<string> {
    // Ensure categories are loaded
    if (!this.categoriesLoaded) {
      await this.initializeCategories();
    }

    // Build category instructions dynamically
    const categoryInstructions = this.buildCategoryInstructions();

    return `You are an SEO specialist for n8n workflow automation. 
Generate business-focused SEO metadata that emphasizes value and outcomes over technical details.

Requirements:
- slug: URL-friendly, lowercase, hyphens only, max 50 chars (don't include suffix)
- title: Business value focused, 50-60 characters
- description: Clear business benefits, 150-160 characters  
- keywords: 5-10 relevant search terms as array
- businessValue: 2-4 word primary outcome
- category: The human-readable category name (e.g., "Paid Acquisition", "Growth Marketing")
- category_id: The category ID from the list below (e.g., "cat_1")
- subcategory_id: The subcategory ID from the list below (e.g., "cat_1_sub_1")
- integrations: Service/platform names only as array

${categoryInstructions}

IMPORTANT: You MUST include both category_id and subcategory_id in your response.

Example response format:
{
  "slug": "slack-to-hubspot-automation",
  "title": "Slack to HubSpot Lead Automation",
  "description": "Automatically capture and qualify leads from Slack conversations into HubSpot CRM",
  "keywords": ["slack", "hubspot", "lead generation", "crm", "automation"],
  "businessValue": "Lead Capture",
  "category": "Growth Marketing",
  "category_id": "cat_2",
  "subcategory_id": "cat_2_sub_1",
  "integrations": ["Slack", "HubSpot"]
}

You MUST respond with valid JSON only. Continue the JSON object that has been started.`;
  }

  /**
   * Build category instructions from loaded categories
   */
  private buildCategoryInstructions(): string {
    const topCategories = getTopLevelCategories();
    
    logger.info("📂 Building category instructions", {
      topCategoriesCount: topCategories.length,
      topCategories: topCategories.map(c => ({ id: c.id, name: c.name })),
    });
    
    if (topCategories.length === 0) {
      logger.warn("⚠️ No categories in database, using hardcoded fallback");
      // Fallback to hardcoded categories if database is empty
      return this.getHardcodedCategories();
    }

    let instructions = "CATEGORIES - You MUST choose exactly ONE category_id AND ONE subcategory_id:\n\n";

    topCategories.forEach((category, index) => {
      instructions += `${index + 1}. ${category.name.toUpperCase()} (category_id: "${category.id}")\n`;
      
      const subcategories = getSubcategories(category.id);
      logger.info(`📁 Category ${category.name}`, {
        categoryId: category.id,
        subcategoriesCount: subcategories.length,
        subcategories: subcategories.map(s => ({ id: s.id, name: s.name })),
      });
      
      subcategories.forEach(sub => {
        instructions += `   - ${sub.name} (subcategory_id: "${sub.id}")\n`;
      });
      instructions += "\n";
    });

    return instructions;
  }

  /**
   * Hardcoded categories as fallback
   */
  private getHardcodedCategories(): string {
    return `CATEGORIES - You MUST choose exactly ONE category_id AND ONE subcategory_id:

1. PAID ACQUISITION (category_id: "cat_1")
   - Ad Creative Development (subcategory_id: "cat_1_sub_1")
   - Campaign Management (subcategory_id: "cat_1_sub_2")
   - Bidding & Budget Optimization (subcategory_id: "cat_1_sub_3")
   - Performance Tracking (subcategory_id: "cat_1_sub_4")
   - Other (subcategory_id: "cat_1_sub_other")

2. GROWTH MARKETING (category_id: "cat_2")
   - Lead Generation & Capture (subcategory_id: "cat_2_sub_1")
   - Referral Programs (subcategory_id: "cat_2_sub_2")
   - Viral Loops (subcategory_id: "cat_2_sub_3")
   - Growth Experiments (subcategory_id: "cat_2_sub_4")
   - Other (subcategory_id: "cat_2_sub_other")

3. CONTENT & SEO (category_id: "cat_3")
   - Content Creation & Distribution (subcategory_id: "cat_3_sub_1")
   - SEO Optimization (subcategory_id: "cat_3_sub_2")
   - Social Media Publishing (subcategory_id: "cat_3_sub_3")
   - Content Performance (subcategory_id: "cat_3_sub_4")
   - Other (subcategory_id: "cat_3_sub_other")

4. LIFECYCLE MARKETING (category_id: "cat_4")
   - Email Campaigns (subcategory_id: "cat_4_sub_1")
   - Customer Onboarding (subcategory_id: "cat_4_sub_2")
   - Retention & Win-back (subcategory_id: "cat_4_sub_3")
   - Loyalty Programs (subcategory_id: "cat_4_sub_4")
   - Other (subcategory_id: "cat_4_sub_other")

5. DATA & ANALYTICS (category_id: "cat_5")
   - Data Collection & ETL (subcategory_id: "cat_5_sub_1")
   - Reporting & Dashboards (subcategory_id: "cat_5_sub_2")
   - Attribution Modeling (subcategory_id: "cat_5_sub_3")
   - Predictive Analytics (subcategory_id: "cat_5_sub_4")
   - Other (subcategory_id: "cat_5_sub_other")

6. OPERATIONS (category_id: "cat_6")
   - Sales Operations (subcategory_id: "cat_6_sub_1")
   - Marketing Operations (subcategory_id: "cat_6_sub_2")
   - Revenue Operations (subcategory_id: "cat_6_sub_3")
   - Process Automation (subcategory_id: "cat_6_sub_4")
   - Other (subcategory_id: "cat_6_sub_other")

7. OTHER (category_id: "cat_7")
   - Other (subcategory_id: "cat_7_sub_other")
`;
  }

  /**
   * Build the user message with workflow context
   */
  private buildUserMessage(
    userPrompt: string,
    selectedNodes: DiscoveredNode[]
  ): string {
    const nodeDescriptions = selectedNodes
      .map((n) => {
        const name = n.displayName || n.type.replace("n8n-nodes-base.", "");
        return `${name} (${n.purpose || "processing"})`;
      })
      .join(", ");

    return `Generate SEO metadata for this n8n workflow:
    
User Intent: "${userPrompt}"
Selected Nodes: ${nodeDescriptions}
Number of Nodes: ${selectedNodes.length}

Analyze the user's intent and the selected nodes to determine the most appropriate category and subcategory.
Focus on the business value and practical outcomes. Generate compelling, search-friendly content.
Ensure you include both category_id and subcategory_id based on the workflow's primary purpose.`;
  }

  /**
   * Parse and validate the SEO JSON response
   */
  private parseAndValidateSEO(
    jsonString: string,
    sessionId: string
  ): WorkflowSEOMetadata {
    try {
      logger.info("🔍 Parsing SEO JSON", {
        sessionId,
        jsonLength: jsonString.length,
      });

      const seoData = JSON.parse(jsonString);

      logger.info("📊 Parsed SEO Data (before validation)", {
        sessionId,
        parsedData: seoData,
      });

      // Validate required fields
      this.validateSEOData(seoData);

      // Clean and format the data
      seoData.slug = this.formatSlug(seoData.slug, sessionId);
      seoData.title = this.truncateText(seoData.title, 60);
      seoData.description = this.truncateText(seoData.description, 160);

      // Ensure arrays
      if (!Array.isArray(seoData.keywords)) {
        seoData.keywords = [seoData.keywords].filter(Boolean);
      }
      if (!Array.isArray(seoData.integrations)) {
        seoData.integrations = [seoData.integrations].filter(Boolean);
      }

      // Add metadata
      seoData.generatedAt = new Date().toISOString();

      logger.info("✅ SEO Data Validated and Formatted", {
        sessionId,
        finalData: seoData,
      });

      return seoData as WorkflowSEOMetadata;
    } catch (error) {
      logger.error("❌ Failed to parse/validate SEO JSON", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
        jsonString: jsonString.substring(0, 500),
      });
      
      throw new Error(
        `Failed to parse SEO JSON: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validate that all required SEO fields are present
   */
  private validateSEOData(data: any): void {
    const required = [
      "slug",
      "title",
      "description",
      "keywords",
      "businessValue",
      "category",
      "integrations",
      "category_id",
      "subcategory_id",
    ];
    const missing = required.filter((field) => !data[field]);

    if (missing.length > 0) {
      logger.warn("⚠️ Missing required SEO fields", {
        missingFields: missing,
        providedFields: Object.keys(data),
        data,
      });
      throw new Error(`Missing required SEO fields: ${missing.join(", ")}`);
    }

    logger.info("✅ All required SEO fields present", {
      fields: Object.keys(data),
    });
  }

  /**
   * Format slug with unique suffix
   */
  private formatSlug(slug: string, sessionId: string): string {
    // Clean the slug
    const cleaned = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    // Add unique suffix
    const suffix = sessionId.slice(-6);
    return `${cleaned}-${suffix}`;
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Generate fallback SEO when AI generation fails
   */
  private generateFallbackSEO(
    nodes: DiscoveredNode[],
    userPrompt: string,
    sessionId: string
  ): WorkflowSEOMetadata {
    logger.info("🔧 Generating fallback SEO", {
      sessionId,
      nodeCount: nodes.length,
      userPrompt: userPrompt.substring(0, 100),
    });
    const nodeTypes = nodes.map((n) =>
      n.type
        .replace("n8n-nodes-base.", "")
        .replace(/([A-Z])/g, " $1")
        .trim()
    );

    const mainNodes = nodeTypes.slice(0, 2).join(" to ");
    const slug = this.formatSlug(mainNodes.replace(/\s+/g, "-"), sessionId);

    const fallbackSEO = {
      slug,
      title: `${mainNodes} Workflow`,
      description: `Automated workflow connecting ${
        nodeTypes.length
      } services: ${nodeTypes.join(
        ", "
      )}. Built with n8n for seamless integration.`,
      keywords: [
        "n8n",
        "automation",
        "workflow",
        ...nodeTypes.slice(0, 5),
        "integration",
      ],
      businessValue: "Process Automation",
      category: this.detectCategory(nodeTypes),
      integrations: nodeTypes,
      generatedAt: new Date().toISOString(),
      // Default to "Other" category for fallback
      category_id: "cat_7",
      subcategory_id: "cat_7_sub_other",
    };

    logger.info("📦 Fallback SEO Generated", {
      sessionId,
      fallbackSEO,
    });

    return fallbackSEO;
  }

  /**
   * Generate default SEO for minimal workflows
   */
  private generateDefaultSEO(
    userPrompt: string,
    sessionId: string
  ): WorkflowSEOMetadata {
    const slug = this.formatSlug("custom-workflow", sessionId);
    const shortPrompt = userPrompt.substring(0, 100);

    return {
      slug,
      title: "Custom n8n Workflow",
      description: `Custom automation workflow: ${shortPrompt}...`,
      keywords: ["n8n", "automation", "workflow", "custom", "integration"],
      businessValue: "Custom Automation",
      category: "Automation",
      integrations: [],
      generatedAt: new Date().toISOString(),
      // Default to "Other" category
      category_id: "cat_7",
      subcategory_id: "cat_7_sub_other",
    };
  }

  /**
   * Detect workflow category based on node types
   */
  private detectCategory(nodeTypes: string[]): WorkflowSEOMetadata["category"] {
    const nodeString = nodeTypes.join(" ").toLowerCase();

    if (
      nodeString.includes("slack") ||
      nodeString.includes("email") ||
      nodeString.includes("telegram")
    ) {
      return "Communication";
    }
    if (
      nodeString.includes("database") ||
      nodeString.includes("postgres") ||
      nodeString.includes("mysql")
    ) {
      return "Data Integration";
    }
    if (
      nodeString.includes("github") ||
      nodeString.includes("gitlab") ||
      nodeString.includes("docker")
    ) {
      return "DevOps";
    }
    if (
      nodeString.includes("salesforce") ||
      nodeString.includes("hubspot") ||
      nodeString.includes("pipedrive")
    ) {
      return "Sales";
    }
    if (
      nodeString.includes("stripe") ||
      nodeString.includes("paypal") ||
      nodeString.includes("square")
    ) {
      return "Analytics";
    }
    if (nodeString.includes("webhook") || nodeString.includes("http")) {
      return "Monitoring";
    }

    return "Automation";
  }

  /**
   * Save category mapping to Supabase
   */
  private async saveCategoryMapping(
    sessionId: string,
    categoryId: string,
    subcategoryId: string
  ): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { error } = await supabase
        .from('workflow_categories')
        .upsert({
          session_id: sessionId,
          category_id: categoryId,
          subcategory_id: subcategoryId
        });

      if (error) {
        logger.error("Failed to save category mapping", {
          sessionId,
          error: error.message,
        });
      } else {
        logger.info("Category mapping saved", {
          sessionId,
          categoryId,
          subcategoryId,
        });
      }
    } catch (error) {
      logger.error("Error saving category mapping", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Singleton instance
let seoGeneratorInstance: SEOGeneratorService | null = null;

export function getSEOGenerator(): SEOGeneratorService {
  if (!seoGeneratorInstance) {
    seoGeneratorInstance = new SEOGeneratorService();
  }
  return seoGeneratorInstance;
}
