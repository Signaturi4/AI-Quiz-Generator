import "./layout.css";
import SupabaseProvider from "../providers/SupabaseProvider";

export const metadata = {
  title: "Nuanu Certifications Portal",
};

export default function CorpLayout({ children }) {
  return (
    <SupabaseProvider>
      <div className="corp-shell">
        <main className="relative z-10 mx-auto w-full max-w-6xl">
          {children}
        </main>
      </div>
    </SupabaseProvider>
  );
}
