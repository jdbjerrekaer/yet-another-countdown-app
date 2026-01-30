import { registerPlugin } from "@capacitor/core";

export interface BuildInfoPlugin {
  getBuildType(): Promise<{ buildType: "debug" | "release" }>;
  log(input: { message: string; data?: Record<string, unknown> }): Promise<void>;
}

const BuildInfo = registerPlugin<BuildInfoPlugin>("BuildInfoPlugin");

export default BuildInfo;
