import landMine from '../assets/landMines/landMine.svg';
import bomb from '../assets/landMines/bomb1.svg';

export const landMines = {
    landMine: landMine,
    bomb: bomb
}

export function getLandMine() {
    return landMines.bomb;
}