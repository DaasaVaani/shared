export interface SearchScriptData {
  formatVersion: 1;
  profile: "unicode16-search-scripts-v1";
  unicodeVersion: "16.0.0";
  defaultScript: "Zzzz";
  extensionsDefault: "primary-script";
  sourceSha256: {
    "Scripts.txt": string;
    "ScriptExtensions.txt": string;
    "PropertyValueAliases.txt": string;
  };
  licenseSha256: string;
  scriptValues: [string, string][];
  scriptRanges: [number, number, string][];
  extensionRanges: [number, number, string[]][];
}
