import bomb from '../assets/landMines/bomb1.svg';
import lastMine from '../assets/landMines/explosionMarker.svg';
import realBomb from '../assets/landMines/realBomb.svg';

export const landMines = {
    lastMine: lastMine,
    bomb: bomb,
    realBomb: realBomb
}

export function getLandMine() {
    return landMines.bomb;
}

export function getBomb() {
    return landMines.bomb;
}