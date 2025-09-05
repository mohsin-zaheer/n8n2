"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [checkingSession, setCheckingSession] = useState(true);
  const returnUrl = searchParams.get("returnUrl") || "/";
  const supabase = createClient();

  useEffect(() => {
    // Check for auth errors in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth');
    const errorMessage = urlParams.get('message');
    
    if (authError === 'error') {
      setError(errorMessage ? decodeURIComponent(errorMessage) : 'Authentication failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Listen for auth state changes (including OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Add a small delay to ensure localStorage is available after OAuth redirect
        setTimeout(() => {
          // Successfully authenticated, now check for pending workflow
          const pendingSession = localStorage.getItem("pending_workflow_session") || 
                                sessionStorage.getItem("pending_workflow_session");
          
          console.log('Pending session data:', pendingSession);
          
          if (pendingSession) {
            try {
              const sessionData = JSON.parse(pendingSession);
              console.log('Parsed session data:', sessionData);
              
              if (sessionData.workflowSessionId) {
                console.log('Redirecting to workflow:', sessionData.workflowSessionId);
                router.push(`/workflow/${sessionData.workflowSessionId}`);
                return;
              }
            } catch (e) {
              console.error("Error parsing pending session:", e);
              // If parsing fails, treat the whole string as session token
              console.log('Treating as raw session token, redirecting to returnUrl');
            }
          }
          
          // Otherwise redirect to the return URL
          console.log('No pending session, redirecting to:', returnUrl);
          router.push(returnUrl);
        }, 100);
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        setCheckingSession(false);
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    // Also check current auth state on mount
    const checkCurrentAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error("Error getting user:", error);
          // Clear potentially corrupted session
          await supabase.auth.signOut();
          setCheckingSession(false);
          return;
        }

        if (user) {
          // Check for pending workflow session
          const pendingSession = localStorage.getItem("pending_workflow_session") || 
                                sessionStorage.getItem("pending_workflow_session");
          
          console.log('Current auth check - pending session:', pendingSession);
          
          if (pendingSession) {
            try {
              const sessionData = JSON.parse(pendingSession);
              if (sessionData.workflowSessionId) {
                console.log('Already authenticated, redirecting to workflow:', sessionData.workflowSessionId);
                router.push(`/workflow/${sessionData.workflowSessionId}`);
                return;
              }
            } catch (e) {
              console.error("Error parsing pending session:", e);
            }
          }
          
          // Otherwise redirect to the return URL
          console.log('Already authenticated, redirecting to:', returnUrl);
          router.push(returnUrl);
        } else {
          setCheckingSession(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setCheckingSession(false);
      }
    };

    checkCurrentAuth();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router, returnUrl, supabase.auth]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      // Preserve pending session data across login
      const pendingSession = localStorage.getItem("pending_workflow_session");
      let redirectUrl = returnUrl;
      
      console.log('handleGoogleLogin - pendingSession:', pendingSession);
      
      if (pendingSession) {
        // Store in sessionStorage as backup
        sessionStorage.setItem("pending_workflow_session", pendingSession);
        
        // If there's a pending workflow, redirect to that specific workflow page
        try {
          const sessionData = JSON.parse(pendingSession);
          console.log('handleGoogleLogin - parsed sessionData:', sessionData);
          if (sessionData.workflowSessionId) {
            redirectUrl = `/workflow/${sessionData.workflowSessionId}`;
            console.log('handleGoogleLogin - redirectUrl set to:', redirectUrl);
          }
        } catch (e) {
          console.error("Error parsing pending session:", e);
          // If it's not JSON, it might be a raw session token
          // In this case, we'll let the workflow page handle it
        }
      }

      // Use the API route instead of direct OAuth to ensure proper error handling
      window.location.href = `/api/auth/login?redirectTo=${encodeURIComponent(redirectUrl)}`;
      
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-[rgb(236,244,240)]" />
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-neutral-200 shadow-lg">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="card-icon bg-[rgba(27,200,140,0.12)] text-emerald-700">
                  <i className="fa-solid fa-lock text-[rgb(27,200,140)]" />
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
                Sign in to continue
              </h1>

              <p className="text-base text-neutral-600 mb-8">
                {returnUrl === "/workflow/create"
                  ? "Sign in to create your workflow automation"
                  : "Sign in to access your workflows"}
              </p>

              <div className="space-y-4">
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full btn bg-[rgb(27,200,140)] flex items-center justify-center gap-3"
                >
                  {!loading && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {loading ? "Signing in..." : "Continue with Google"}
                </Button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </div>

              <p className="mt-6 text-sm text-neutral-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-white/90 hover:text-white text-sm transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-neutral-600">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
