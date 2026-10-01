export type Section = "dashboard" | "clients" | "releves" | "factures";

type SidebarProps = {
  activeSection: Section;
  onSelect: (section: Section) => void;
};

const navigationItems: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "clients", label: "Clients", icon: "👥" },
  { id: "releves", label: "Relevés", icon: "🧾" },
  { id: "factures", label: "Factures", icon: "💧" },
];

function Sidebar({ activeSection, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">💧</span>
        <span>Eau potable</span>
      </div>
      <nav aria-label="Navigation principale">
        {navigationItems.map((item) => (
          <button
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
