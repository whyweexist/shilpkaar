import { NavLink } from "react-router-dom";
import { Home, Package, BarChart3, User, Plus } from "lucide-react";

const linkBase =
  "flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium min-h-[56px] min-w-[56px] flex-1";

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 items-end bg-white/95 backdrop-blur-[12px]"
      style={{
        height: "calc(var(--nav-h) + env(safe-area-inset-bottom))",
        borderTop: "1px solid var(--clr-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main"
    >
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${linkBase} ${isActive ? "text-[var(--clr-terracotta)]" : "text-[var(--clr-ink-soft)]"}`
        }
      >
        <Home size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/products"
        className={({ isActive }) =>
          `${linkBase} ${isActive ? "text-[var(--clr-terracotta)]" : "text-[var(--clr-ink-soft)]"}`
        }
      >
        <Package size={20} />
        <span>Products</span>
      </NavLink>

      {/* Raised Add button */}
      <div className="flex flex-1 flex-col items-center">
        <NavLink
          to="/add"
          aria-label="Add product"
          className="focus-ring flex h-[52px] w-[52px] -translate-y-[14px] items-center justify-center rounded-full bg-[var(--clr-terracotta)] text-white"
          style={{
            background: `linear-gradient(135deg, var(--clr-terracotta) 0%, var(--clr-terracotta-lt) 100%)`,
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </NavLink>
        <span className="-mt-2 text-[10.5px] font-medium text-[var(--clr-ink-soft)]">Add</span>
      </div>

      <NavLink
        to="/insights"
        className={({ isActive }) =>
          `${linkBase} ${isActive ? "text-[var(--clr-terracotta)]" : "text-[var(--clr-ink-soft)]"}`
        }
      >
        <BarChart3 size={20} />
        <span>Insights</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `${linkBase} ${isActive ? "text-[var(--clr-terracotta)]" : "text-[var(--clr-ink-soft)]"}`
        }
      >
        <User size={20} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
