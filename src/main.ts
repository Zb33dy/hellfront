import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import './ui/styles.css';
import { Game } from './core/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLDivElement;
const game = new Game(canvas, uiRoot);
void game.boot();
// Debug/automation handle (see README → "Debug hooks").
(window as unknown as { __hf: Game }).__hf = game;
