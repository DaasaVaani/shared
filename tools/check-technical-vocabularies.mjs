import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";

const inventory = await loadTechnicalTokenInventory();
console.log(`Technical atom settings valid: ${inventory.profiles.length} profiles, ${inventory.profiles.reduce((count, profile) => count + profile.atoms.length, 0)} atoms; not complete production profiles`);
