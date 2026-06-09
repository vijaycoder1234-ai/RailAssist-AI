import { Link } from "@tanstack/react-router";
import { Train } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-rail text-primary-foreground">
              <Train className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-bold">
              RailAssist <span className="text-gradient-rail">AI</span>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            AI-powered railway incident intelligence, safety monitoring and predictive
            maintenance for modern transport authorities.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Platform</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Account</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Inspector Login</Link></li>
            <li><Link to="/auth" search={{ tab: "register" }} className="hover:text-foreground">Inspector Registration</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} RailAssist AI. All rights reserved.</span>
          <span>Making Railways Safer, Smarter and More Efficient</span>
        </div>
      </div>
    </footer>
  );
}
