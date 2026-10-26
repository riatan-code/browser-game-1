import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config.ts';
import { Game } from './core/Game.ts';
import { BreakoutScene } from './scenes/BreakoutScene.ts';

const app = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!app || !canvas) throw new Error('#app or #game not found');

const game = new Game(canvas);
game.start(new BreakoutScene(GAME_WIDTH, GAME_HEIGHT, game.input, app));
