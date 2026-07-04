import { Position } from "../types/chess";

export const getSquareNotation = (position: Position): string => {
    return `${String.fromCharCode(position.x + 97)}${position.y + 1}`;
};

export const getFileNotation = (file: number): string => {
    return `${String.fromCharCode(file + 97)}`;
}