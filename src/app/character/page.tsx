import { CharacterPanel } from "../../components/CharacterPanel";
import { loadCharacterView } from "../actions/character";

export const dynamic = "force-dynamic";

export default async function CharacterPage() {
  const view = await loadCharacterView();
  return <CharacterPanel view={view} />;
}
