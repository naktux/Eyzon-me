import { createRoot } from "react-dom/client";
import Dashboard from "../components/Dashboard";
import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-600.css";
import "./dashboard.css";
createRoot(document.getElementById("root")!).render(<Dashboard/>);
