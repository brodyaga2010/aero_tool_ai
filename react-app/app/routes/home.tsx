import type { Route } from "./+types/home";
import App from "~/App";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ToolTrack" },
    { name: "description", content: "Система автоматизации выдачи инструментов" },
  ];
}

export default function Home() {
  return <App />;
}
