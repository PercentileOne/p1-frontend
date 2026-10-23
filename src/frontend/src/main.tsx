import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PermissionProvider } from "./auth/usePermissions";
import "./index.css";
import "./autofill.css";

// Tells the loading guard in index.html that the main file has finished downloading and is running (see the boot guard there).
(window as unknown as { __ticEntryRan?: boolean }).__ticEntryRan = true;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
