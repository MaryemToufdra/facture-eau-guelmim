import { useState } from "react";
import Sidebar, { Section } from "./components/Sidebar";
import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import FacturesPage from "./pages/FacturesPage";
import ReleveesPage from "./pages/ReleveesPage";
import "./App.css";

function App() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  function renderPage() {
    switch (activeSection) {
      case "clients":
        return <ClientsPage />;
      case "releves":
        return <ReleveesPage />;
      case "factures":
        return <FacturesPage />;
      default:
        return <DashboardPage />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} />
      <div className="app-body">
        <header className="topbar">
          <h1>Gestion Eau Potable - Guelmim</h1>
        </header>
        <main className="main-content">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
