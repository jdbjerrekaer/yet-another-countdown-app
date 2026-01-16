import { registerPlugin } from "@capacitor/core";

export interface BuildInfoPlugin {
  getBuildType(): Promise<{ buildType: "debug" | "release" }>;
}

const BuildInfo = registerPlugin<BuildInfoPlugin>("BuildInfoPlugin");

export default BuildInfo;
