import { WorldBackgroundLayer } from "./layers/WorldBackgroundLayer";
import { WorldAtmosphereLayer } from "./layers/WorldAtmosphereLayer";
import { WorldLightingLayer } from "./layers/WorldLightingLayer";
import { WorldContentLayer } from "./layers/WorldContentLayer";
import { WorldGlowLayer } from "./layers/WorldGlowLayer";
import { WorldInteractionLayer } from "./layers/WorldInteractionLayer";
import { WorldTransitionOverlay } from "./layers/WorldTransitionOverlay";
import { useScrollReset } from "../../hooks/useScrollReset";
import { useExplorerMachine } from "../../state/useExplorerMachine";

export const ExplorerRightPanel = () => {
  const machineState = useExplorerMachine((s) => s.state);

  // Reset scroll when state changes
  useScrollReset(machineState);

  return (
    <div className="explorer-right-panel">
      <WorldBackgroundLayer />
      <WorldAtmosphereLayer />
      <WorldLightingLayer />
      <WorldContentLayer />
      <WorldGlowLayer />
      <WorldInteractionLayer />
      <WorldTransitionOverlay machineState={machineState} />
    </div>
  );
};
