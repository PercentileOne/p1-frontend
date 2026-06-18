import { ExplorerLeftPanel } from "./left/ExplorerLeftPanel";
import { ExplorerRightPanel } from "./right/ExplorerRightPanel";
import { ExplorerMiddlePanel } from "./middle/ExplorerMiddlePanel";
import "./../explorer.css";
import "./left/explorer-left-panel.css";
import "./middle/explorer-middle-panel.css";
import "./right/explorer-right-panel.css";

export const ExplorerLayout = () => {
  return (
    <div className="explorer-layout">
      <ExplorerLeftPanel />
      <ExplorerMiddlePanel />
      <ExplorerRightPanel />
    </div>
  );
};
