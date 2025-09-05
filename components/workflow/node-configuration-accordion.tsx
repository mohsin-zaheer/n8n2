"use client";

import React from "react";
import { NodeIcon } from "@/components/ui/node-icon";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { resolveIconName } from "@/lib/icon-aliases";
import { normalizeNodeType } from "@/lib/utils/node-type-utils";
import { ExternalLinkIcon, KeyIcon, SettingsIcon, InfoIcon, CheckCircleIcon, AlertCircleIcon, AlertTriangleIcon } from "lucide-react";

export interface WorkflowNode {
  id?: string;
  type: string;
  name?: string;
  purpose?: string;
  parameters?: any;
  credentials?: any;
  position?: [number, number];
}

// Database schema for n8n_nodes
export interface NodeMetadata {
  id: number;
  name: string;
  node_type: string;
  key_parameters?: string;
  essential_settings?: Array<{
    name: string;
    description: string;
  }>;
  documentation_url?: string;
  primary_documentation_url?: string;
  credential_documentation_url?: string;
  business_use_cases?: string[];
  requires_auth?: boolean;
  auth_methods?: string[];
  credential_types?: string[];
}

export interface NodeConfigurationAccordionProps {
  node: WorkflowNode;
  metadata?: NodeMetadata;
  status: string;
  requiresAuth: boolean;
  getIconName: (nodeType: string) => string;
}

export function NodeConfigurationAccordion({ 
  node, 
  metadata, 
  status, 
  requiresAuth, 
  getIconName 
}: NodeConfigurationAccordionProps) {
  const hasParameters = metadata?.key_parameters && metadata.key_parameters.length > 0;
  const hasSettings = metadata?.essential_settings && metadata.essential_settings.length > 0;
  const isConfigured = node.parameters && Object.keys(node.parameters).length > 0;

  return (
    <Collapsible className="border border-neutral-200 rounded-lg">
      <CollapsibleTrigger className="w-full p-4 hover:bg-neutral-50 transition-colors">
        <div className="flex items-center gap-3">
          <NodeIcon
            name={getIconName(node.type)}
            size={20}
            className="h-8 w-8"
            forceBackground
          />
          <div className="flex-1 text-left">
            <div className="font-semibold text-neutral-900">
              {node.name || metadata?.name || node.type.split('.').pop()}
            </div>
            <div className="text-sm text-neutral-600">
              {metadata?.name || node.type.replace(/^.*\./, '')} node
            </div>
          </div>
          <div className="flex items-center gap-2">
            {requiresAuth ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                <AlertTriangleIcon className="h-3 w-3" />
                Configuration Required
              </span>
            ) : isConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <CheckCircleIcon className="h-3 w-3" />
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                <AlertCircleIcon className="h-3 w-3" />
                Needs Setup
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {/* Authentication Required Notice */}
          {requiresAuth && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <KeyIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">Authentication Required</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    This node requires credentials to be configured in n8n.
                  </p>
                  {metadata?.auth_methods && metadata.auth_methods.length > 0 && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Supported methods: {metadata.auth_methods.join(', ')}
                    </p>
                  )}
                  {metadata?.credential_documentation_url && (
                    <a
                      href={metadata.credential_documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-yellow-800 hover:text-yellow-900 underline mt-2"
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                      View credential setup guide
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Key Parameters Section */}
          {hasParameters && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SettingsIcon className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-neutral-900">Key Parameters</span>
              </div>
              <p className="text-sm text-neutral-700 ml-6">
                {metadata?.key_parameters}
              </p>
            </div>
          )}

          {/* Essential Settings */}
          {hasSettings && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <InfoIcon className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-neutral-900">Essential Settings</span>
              </div>
              <ul className="list-disc list-inside text-sm text-neutral-700 space-y-2 ml-6">
                {metadata?.essential_settings?.map((setting, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{setting.name}:</span> {setting.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Business Use Cases */}
          {metadata?.business_use_cases && metadata.business_use_cases.length > 0 && (
            <div>
              <span className="font-medium text-neutral-900 block mb-2">Common Use Cases</span>
              <ul className="list-disc list-inside text-sm text-neutral-700 space-y-1 ml-6">
                {metadata.business_use_cases.map((useCase, idx) => (
                  <li key={idx}>{useCase}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Documentation Links */}
          {(metadata?.primary_documentation_url || metadata?.documentation_url || metadata?.credential_documentation_url) && (
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              {(metadata.primary_documentation_url || metadata.documentation_url) && (
                <a
                  href={metadata.primary_documentation_url || metadata.documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  View Official Documentation
                </a>
              )}
              {metadata.credential_documentation_url && (
                <a
                  href={metadata.credential_documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors block"
                >
                  <KeyIcon className="h-4 w-4" />
                  View Credential Setup Guide
                </a>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
