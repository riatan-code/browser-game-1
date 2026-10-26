import './style.css';
import { Game } from './core/Game.ts';
import { PlaceholderScene } from './scenes/PlaceholderScene.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas not found');

const game = new Game(canvas);
game.start(new PlaceholderScene());
