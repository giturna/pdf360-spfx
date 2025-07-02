import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IPdf360ViewerProps {
  context: WebPartContext;
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
}
