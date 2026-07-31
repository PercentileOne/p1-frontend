import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PermissionProvider } from "./auth/usePermissions";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
