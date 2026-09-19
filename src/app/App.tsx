import { RouterProvider } from "react-router/dom";
import { router } from "./routes";
import { PresentationPointer } from "./components/PresentationPointer";
import { ThemeProvider } from "./theme/ThemeContext";
import { VersionProvider } from "./versioning/VersionContext";
import { ToastProvider } from "./components/ToastContext";
import "./versioning/register"; // side-effect: registers baseline slot implementations

console.log("%c Built by Udayan Vidyanta — github.com/udayanator", "color: #6264A7; font-weight: bold");

export default function App() {
  return (
    <ThemeProvider>
      <VersionProvider>
        <div className="app-viewport fixed inset-x-0 top-0 overflow-hidden bg-black flex justify-center">
          {/* Mobile Frame — 100% on real phones, capped for desktop preview */}
          <div className="app-frame relative w-full h-full max-w-[430px] overflow-hidden">
            <ToastProvider>
              <RouterProvider router={router} />
              <PresentationPointer />
            </ToastProvider>
          </div>
        </div>
      </VersionProvider>
    </ThemeProvider>
  );
}
