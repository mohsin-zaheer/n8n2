// app/w/[slug]/page.tsx

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getWorkflowQueries } from "@/lib/db/workflow-queries";
import { Button } from "@/components/ui/button";
import { NodeIcon } from "@/components/ui/node-icon";
import { resolveIconName } from "@/lib/icon-aliases";
import { VettedBadge } from "@/components/ui/vetted-badge";
import { Download, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { loadCategories, getCategoryName, getSubcategoryName, categoryIcons } from "@/lib/services/category-helper.service";
import { getNodeMetadata, NodeMetadata } from "@/lib/actions/node-metadata.actions";
import { NodeConfigurationAccordion } from "@/components/workflow/node-configuration-accordion";

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const queries = getWorkflowQueries();
  const workflow = await queries.findBySlug(params.slug);

  if (!workflow?.seo) {
    return {
      title: "Workflow Not Found | n8n Growth Agents",
      description: "The requested workflow could not be found.",
      robots: "noindex, nofollow",
    };
  }

  const seo = workflow.seo;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://n8n-growth-agents.com';
  const canonicalUrl = `${baseUrl}/w/${params.slug}`;

  return {
    title: `${seo.title} | n8n Growth Agents`,
    description: seo.description,
    keywords: seo.keywords?.join(', '),
    authors: [{ name: 'n8n Growth Agents' }],
    creator: 'n8n Growth Agents',
    publisher: 'n8n Growth Agents',
    category: seo.category,
    classification: 'Automation Workflow',
    robots: 'index, follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: 'n8n Growth Agents',
      type: 'article',
      publishedTime: workflow.createdAt,
      modifiedTime: workflow.updatedAt,
      tags: seo.keywords,
      images: seo.ogImage ? [
        {
          url: seo.ogImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        }
      ] : [
        {
          url: `${baseUrl}/og-default.png`,
          width: 1200,
          height: 630,
          alt: seo.title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : [`${baseUrl}/og-default.png`],
      creator: '@n8nGrowthAgents',
      site: '@n8nGrowthAgents',
    },
    other: {
      'article:author': workflow.user?.full_name || 'n8n Growth Agents',
      'article:section': seo.category,
      'article:tag': seo.keywords?.join(', '),
      'workflow:nodes': workflow.workflow?.nodes?.length?.toString() || '0',
      'workflow:integrations': seo.integrations?.join(', ') || '',
      'workflow:business-value': seo.businessValue || '',
    },
  };
}

export default async function WorkflowPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  // Load categories for display
  await loadCategories();
  
  // Fetch workflow data from Supabase
  const queries = getWorkflowQueries();
  const workflowData = await queries.findBySlug(params.slug);

  if (!workflowData) {
    notFound();
  }

  const { seo, workflow, sessionId, createdAt, userPrompt, configAnalysis } =
    workflowData;
  const nodeCount = workflow?.nodes?.length || 0;
  const orderedNodes = Array.isArray(workflow?.nodes)
    ? workflow.nodes.filter((node: any) => {
        const base = String(node?.type || "")
          .replace("n8n-nodes-base.", "")
          .replace("@n8n/n8n-nodes-langchain.", "")
          .replace("nodes-base.", "")
          .replace("nodes-langchain.", "")
          .split(".")[0];
        return base !== "stickyNote";
      })
    : [];
  
  // Extract unique node types and fetch metadata from database
  const nodeTypes = orderedNodes.map((node: any) => node.type);
  const uniqueNodeTypes = [...new Set(nodeTypes)] as string[];
  const nodeMetadata = await getNodeMetadata(uniqueNodeTypes);
  
  const getIconName = (nodeType: string) => {
    const base = nodeType
      .replace("n8n-nodes-base.", "")
      .replace("@n8n/n8n-nodes-langchain.", "")
      .replace("nodes-base.", "")
      .replace("nodes-langchain.", "")
      .split(".")[0];
    return resolveIconName(base);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-neutral-50">
      <div className="max-w-screen-lg mx-auto px-4 pt-7 sm:pt-8 md:pt-10 pb-8">
        {/* Action buttons row */}
        <div className="flex justify-between gap-2 mb-4">
          <a href="/directory">
            <Button variant="outline" className="border-black text-black hover:bg-gray-50">
              <ArrowLeft className="mr-2 h-4 w-4" /> All workflows
            </Button>
          </a>
          <a
            href={`/api/workflow/${sessionId}/export`}
            download={`${seo?.slug || "workflow"}.json`}
          >
            <Button className="bg-black text-white hover:bg-gray-800">
              <Download className="mr-2 h-4 w-4" /> Download JSON
            </Button>
          </a>
        </div>

        {/* Title directly on grey background */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">
          {seo?.title || workflow?.settings?.name || "Workflow"}
        </h1>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left (2/3) - scrolls with page */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">
                Description
              </h2>
              <p className="text-sm text-neutral-700 mb-3">
                {seo?.description || "Automated workflow built with n8n"}
              </p>
              {userPrompt && (
                <>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                    Original Request
                  </h3>
                  <p className="text-sm text-neutral-700">{userPrompt}</p>
                </>
              )}
              {/* Category Section */}
              {(seo?.category_id || seo?.category) && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                    Category
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {seo?.category_id ? (
                      <>
                        {/* Main category with icon */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full text-sm font-medium">
                          {(() => {
                            const Icon = categoryIcons[seo.category_id];
                            return Icon ? <Icon className="h-3 w-3" /> : null;
                          })()}
                          {getCategoryName(seo.category_id) || seo.category || 'Other'}
                        </span>
                        
                        {/* Subcategory if different from main category */}
                        {seo?.subcategory_id && seo.subcategory_id !== seo.category_id && (
                          <>
                            <span className="text-neutral-400">→</span>
                            <span className="px-3 py-1 bg-white text-black border border-gray-300 rounded-full text-sm font-medium">
                              {getSubcategoryName(seo.subcategory_id)}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      /* Fallback to old category field if no new data */
                      <span className="px-3 py-1 bg-black text-white rounded-full text-sm font-medium">
                        {seo.category}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Comprehensive Setup Guide */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">
                Comprehensive Setup Guide
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Step-by-step configuration guide for each node
              </p>
              {orderedNodes.length > 0 ? (
                <div className="space-y-4">
                  {orderedNodes.map((node: any, idx: number) => {
                    const nodeType = node.type;
                    const metadata = nodeMetadata[nodeType];
                    const requiresAuth = metadata?.requires_auth || nodeType.includes('Gmail') || nodeType.includes('Slack') || nodeType.includes('Google') || nodeType.includes('Twitter') || nodeType.includes('LinkedIn');
                    const status = requiresAuth ? 'Configuration Required' : 'Configured';
                    
                    return (
                      <NodeConfigurationAccordion
                        key={node.id ?? idx}
                        node={node}
                        metadata={metadata}
                        status={status}
                        requiresAuth={requiresAuth}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No nodes found</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">
                Integrations
              </h2>
              <div className="flex flex-wrap gap-2">
                {seo?.integrations?.length > 0 ? (
                  seo.integrations.map((integration, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                    >
                      {integration}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">
                    No integrations specified
                  </p>
                )}
              </div>
            </div>

            {/* Configuration Analysis Card moved to left column */}
            {configAnalysis && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">
                  Configuration Status
                </h2>
                <div className="mb-4 p-3 bg-neutral-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Status</span>
                    <span
                      className={`text-sm font-semibold ${
                        configAnalysis.isComplete
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {configAnalysis.isComplete
                        ? "Ready"
                        : "Needs Configuration"}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600">
                    {configAnalysis.configuredNodes} of{" "}
                    {configAnalysis.totalNodes} nodes configured
                  </div>
                  {configAnalysis.missingCredentials?.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
                      Missing credentials:{" "}
                      {configAnalysis.missingCredentials.join(", ")}
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Node Details
                  </div>
                  {configAnalysis.nodes?.map((node: any) => (
                    <div
                      key={node.id}
                      className="p-2 bg-neutral-50 rounded text-xs"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-neutral-900">
                          {node.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            node.status === "configured"
                              ? "bg-green-100 text-green-700"
                              : node.status === "needs_credentials"
                              ? "bg-orange-100 text-orange-700"
                              : node.status === "needs_decisions"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {node.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-neutral-600 text-xs">
                        {node.purpose}
                      </div>
                      {node.needsCredentials?.length > 0 && (
                        <div className="mt-1 text-orange-600">
                          Needs:{" "}
                          {node.needsCredentials
                            .map((c: any) => c.variable)
                            .join(", ")}
                        </div>
                      )}
                      {node.needsDecisions?.length > 0 && (
                        <div className="mt-1 text-blue-600">
                          Decisions: {node.needsDecisions.length} required
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right (1/3) - sticky on desktop, with padding under header */}
          <div className="md:col-span-1 md:sticky md:top-[76px] md:self-start">
            <div className={`bg-white rounded-lg shadow-sm p-6 ${
              workflowData.isVetted 
                ? 'border-2 border-green-400 shadow-[0_0_20px_rgba(27,200,140,0.2)]' 
                : 'border border-neutral-200'
            }`}>
              {/* Vetted Badge */}
              {workflowData.isVetted && (
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white w-full justify-center" style={{
                    background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
                  }}>
                    ✓ Vetted workflow
                  </span>
                </div>
              )}
              
              {/* Creator Section */}
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                Created by
              </h3>
              
              {workflowData.user && (
                <div className="flex items-start gap-3 mb-4">
                  {/* Larger Avatar */}
                  {workflowData.user.avatar_url ? (
                    <Image 
                      src={workflowData.user.avatar_url} 
                      alt={workflowData.user.full_name || workflowData.user.email}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-medium text-blue-600">
                        {(() => {
                          const fullName = workflowData.user.full_name;
                          const email = workflowData.user.email;
                          
                          if (fullName) {
                            const words = fullName.trim().split(/\s+/);
                            if (words.length >= 2) {
                              return (words[0][0] + words[1][0]).toUpperCase();
                            } else {
                              return words[0].slice(0, 2).toUpperCase();
                            }
                          } else if (email) {
                            const emailPrefix = email.split('@')[0];
                            return emailPrefix.slice(0, 2).toUpperCase();
                          }
                          
                          return 'AU';
                        })()}
                      </span>
                    </div>
                  )}
                  {/* Name and Date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {workflowData.user.full_name || workflowData.user.email}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Book a Call section - Only for vetted workflows */}
              {workflowData.isVetted && (
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                    Get help to set this up
                  </h3>
                  <button className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium">
                    Book a call
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
