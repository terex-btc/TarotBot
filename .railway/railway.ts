import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "tarot-bot";
export default defineRailway(() => {
  const tarotBot = service("tarot-bot", {
    source: github("terex-btc/TarotBot", { branch: "main", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "NIXPACKS" },
    start: "node backend/server.js",
    // Як було в railway.json: перезапуск лише після падіння, до 3 спроб.
    // restartPolicyType не пишемо: ON_FAILURE — типове значення Railway, сервер зберігає його як null
    deploy: { restartPolicyMaxRetries: 3 },
    replicas: { "europe-west4-drams3a": 1 },
    networking: { privateNetworkEndpoint: "kind-passion" },
  });

  return project("Tarot", {
    variables: { managed: false },
    resources: [tarotBot],
  });
});
