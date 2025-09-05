"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase-client";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import styles from "../stylesheets/nav.module.css";
import { Icon } from "@iconify/react";
import { loadCategories, getCategoryHierarchy, categoryIcons } from "@/lib/services/category-helper.service";
import { CategoryWithSubcategories } from "@/types/categories";
import { Search, ChevronRight } from "lucide-react";

type HeaderVariant = "landing" | "default";

export function Header({ variant }: { variant?: HeaderVariant }) {
  const pathname = usePathname();
  const computedVariant: HeaderVariant =
    variant ?? (pathname === "/" ? "landing" : "default");
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDirOpen, setMobileDirOpen] = useState(true);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileOpen]);

  // Load categories from Supabase in real-time
  useEffect(() => {
    const supabase = createClient();
    
    const loadCategoriesData = async () => {
      try {
        // Fetch categories from Supabase
        const { data: categoriesData, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            description,
            subcategories (
              id,
              name,
              description
            )
          `)
          .eq('active', true)
          .neq('id', 'cat_8') // Filter out 'Other' category
          .order('name');

        if (error) {
          console.error('Error loading categories:', error);
          // Fallback to local categories
          await loadCategories();
          const hierarchy = getCategoryHierarchy();
          const filteredCategories = hierarchy.filter(cat => cat.id !== 'cat_8');
          setCategories(filteredCategories);
        } else {
          // Transform Supabase data to match CategoryWithSubcategories interface
          const transformedCategories = (categoriesData || []).map(cat => ({
            ...cat,
            parent_id: null,
            level: 0,
            items: [],
            display_order: 0,
            created_at: new Date().toISOString(),
            subcategories: (cat.subcategories || []).map((sub: any) => ({
              ...sub,
              parent_id: cat.id,
              level: 1,
              items: [],
              display_order: 0,
              created_at: new Date().toISOString()
            }))
          }));
          setCategories(transformedCategories);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to local categories
        await loadCategories();
        const hierarchy = getCategoryHierarchy();
        const filteredCategories = hierarchy.filter(cat => cat.id !== 'cat_8');
        setCategories(filteredCategories);
      }
    };

    loadCategoriesData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('categories_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          loadCategoriesData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check authentication status
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const base = "sticky top-0 z-40 transition-colors ";
  const landingTop = "bg-transparent";
  const defaultTop = "bg-transparent text-neutral-900 ";
  const scrolled = "bg-white text-neutral-900 border-b border-neutral-200";

  const headerClass = cn(
    base,
    isScrolled ? scrolled : computedVariant === "landing" ? landingTop : defaultTop
  );

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={headerClass}>
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        <div >
          <Link
            href="/"
            className={cn(
              "text-base sm:text-lg font-bold tracking-tight hover:opacity-80 transition-opacity",
              styles.logo,
              computedVariant === "landing" && !isScrolled ? "text-white" : "text-neutral-900"
            )}
          >
          <Icon icon="solar:ghost-bold" style={{fontSize: '28px'}}  />
            n8n Growth Agents
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          {/* Build your growth agent button */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-3 py-1 border rounded-md font-semibold transition-all hover:opacity-80",
              computedVariant === "landing" && !isScrolled
                ? "border-white text-white"
                : computedVariant === "landing"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-white"
            )}
            style={computedVariant !== "landing" ? {
              background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
            } : {}}
          >
            <Icon icon="mdi:rocket-launch" className="text-lg" />
            <span>Build your growth agent</span>
          </Link>

          {/* Directory dropdown */}
          <div className="relative inline-block group">
            <Link
              href="/directory"
              className={cn(
                "flex items-center gap-2 px-3 py-1 border rounded-md font-semibold transition-all hover:opacity-80",
                computedVariant === "landing" && !isScrolled 
                  ? "bg-white text-neutral-900 border-white" 
                  : "border-neutral-900 text-neutral-900"
              )}
              aria-haspopup="menu"
            >
              <Icon icon="mdi:folder-outline" className="text-lg" />
              <span>Directory</span>
              <Icon
                icon="mdi:chevron-down"
                className="text-base transition-transform duration-200 group-hover:rotate-180"
              />
            </Link>

            {/* Enhanced Dropdown menu */}
            <div
              className="absolute left-0 mt-3 w-80 origin-top-left rounded-2xl border border-neutral-200/60 bg-white backdrop-blur-xl shadow-2xl ring-1 ring-black/5
                         opacity-0 invisible translate-y-2 scale-95 transition-all duration-300 ease-out z-50
                         group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100"
              role="menu"
              aria-label="Directory menu"
            >
              <div className="p-3">
                {/* Header */}
                <div className="px-3 py-2 mb-2">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1">Browse Categories</h3>
                  <p className="text-xs text-neutral-500">Discover workflows by category</p>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-1 gap-1 mb-3">
                  {categories.map((category, index) => {
                    const IconComponent = categoryIcons[category.id];
                    return (
                      <div key={category.id} className="group/item">
                        <Link
                          href={`/directory?category=${category.id}`}
                          role="menuitem"
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-neutral-700 
                                   transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-neutral-50 hover:to-neutral-100/50 
                                   hover:text-neutral-900 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]
                                   border border-transparent hover:border-neutral-200/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/50 
                                        group-hover/item:from-emerald-50 group-hover/item:to-emerald-100/50 transition-all duration-200">
                            {IconComponent && <IconComponent className="h-4 w-4 text-neutral-600 group-hover/item:text-emerald-600 transition-colors duration-200" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{category.name}</div>
                            {category.subcategories && category.subcategories.length > 0 && (
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {category.subcategories.length} subcategories
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-neutral-400 group-hover/item:text-neutral-600 transition-all duration-200 
                                                 group-hover/item:translate-x-0.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Separator */}
                <div className="border-t border-neutral-200/60 my-3"></div>

                {/* Special Actions */}
                <div className="space-y-2">
                  <Link
                    href="/directory"
                    role="menuitem"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-700 
                             transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100">
                      <Search className="h-4 w-4 text-neutral-600" />
                    </div>
                    <span>Browse All Workflows</span>
                  </Link>
                  
                  <Link
                    href="/directory?vetted=true"
                    role="menuitem"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white 
                             transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                             bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
                      <Icon icon="mdi:shield-check" className="h-4 w-4" />
                    </div>
                    <span>Vetted Workflows Only</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center h-8">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-neutral-200 animate-pulse" />
            ) : user ? (
              <UserAvatar user={user} />
            ) : (
              <Button
                onClick={handleLogin}
                className={cn(
                  "border-0 shadow-sm font-semibold transition-all",
                  computedVariant === "landing" && !isScrolled 
                    ? "bg-white text-neutral-900 hover:bg-neutral-100"
                    : "bg-neutral-900 hover:bg-neutral-800 text-white"
                )}
                size="sm"
              >
                Login
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className={cn(
            "sm:hidden p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(27,200,140)]",
            computedVariant === "landing" && !isScrolled ? "text-white" : "text-neutral-900"
          )}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Icon icon="mdi:menu" className="text-2xl" />
        </button>
      </div>

      {/* Mobile sheet with slide transition */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex transition",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeMobile}
          aria-hidden
        />

        {/* Slide-in panel */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white text-neutral-900 shadow-xl p-4 flex flex-col transform transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-end">
            <button
              className="p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(27,200,140)]"
              aria-label="Close menu"
              onClick={closeMobile}
            >
              <Icon icon="mdi:close" className="text-2xl" />
            </button>
          </div>

          {/* Mobile: Directory accordion */}
          <div className="mt-4">
            <button
              className="w-full flex items-center justify-between px-3 py-2 "
              aria-expanded={mobileDirOpen}
              aria-controls="mobile-directory"
            >
              <span className="flex items-center gap-2 font-bold">
                <Icon icon="mdi:folder-outline" className="text-lg" />
                Directory
              </span>
            
            </button>

            <div
              id="mobile-directory"
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out mt-3",
               "grid-rows-[1fr] opacity-100"
              )}
            >
              <div className="min-h-0 overflow-hidden rounded-xl border border-neutral-200/60 bg-white/95 backdrop-blur-sm">
                {/* Mobile Categories */}
                <div className="p-3">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">Categories</h3>
                    <p className="text-xs text-neutral-500">Browse workflows by category</p>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    {categories.map((category, index) => {
                      const IconComponent = categoryIcons[category.id];
                      return (
                        <Link
                          key={category.id}
                          href={`/directory?category=${category.id}`}
                          onClick={closeMobile}
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg 
                                   transition-all duration-200 hover:bg-gradient-to-r hover:from-neutral-50 hover:to-neutral-100/50 
                                   text-neutral-700 hover:text-neutral-900 border border-transparent hover:border-neutral-200/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/50">
                            {IconComponent && <IconComponent className="h-4 w-4 text-neutral-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{category.name}</div>
                            {category.subcategories && category.subcategories.length > 0 && (
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {category.subcategories.length} subcategories
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        </Link>
                      );
                    })}
                  </div>

                  {/* Mobile Special Actions */}
                  <div className="border-t border-neutral-200/60 pt-3 space-y-2">
                    <Link
                      href="/directory"
                      onClick={closeMobile}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg 
                               transition-all duration-200 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100">
                        <Search className="h-4 w-4 text-neutral-600" />
                      </div>
                      <span>Browse All Workflows</span>
                    </Link>
                    
                    <Link
                      href="/directory?vetted=true"
                      onClick={closeMobile}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-lg 
                               transition-all duration-200 text-white bg-gradient-to-r from-emerald-500 to-teal-600 
                               hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
                        <Icon icon="mdi:shield-check" className="h-4 w-4" />
                      </div>
                      <span>Vetted Workflows Only</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile footer: auth */}
          <div className="mt-auto pt-4 border-t">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-neutral-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-end">
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-neutral-500">Signed in</div>
                </div>
                <UserAvatar user={user} />
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                className="w-full border-0 shadow-sm font-semibold transition-all bg-neutral-900 hover:bg-neutral-800 text-white"
                size="sm"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
