import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config.ts';
import { Game } from './core/Game.ts';
import { BreakoutScene } from './scenes/BreakoutScene.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas not found');

const game = new Game(canvas);
game.start(new BreakoutScene(GAME_WIDTH, GAME_HEIGHT));
