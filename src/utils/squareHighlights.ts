import redSquareHighlight from '../assets/squareHighlights/redTargetHighlight.svg';
import yellowSquareHighlight from '../assets/squareHighlights/yellowTargetHighlight.svg';
import blueOvalHighlight from '../assets/squareHighlights/blueOvalHighlight.svg';
import greyFilledHighlight from '../assets/squareHighlights/greyFilledHighlight.svg';
import unfilledHighlight from '../assets/squareHighlights/unfilledHighlight.svg';
import bombHighlight from '../assets/squareHighlights/bombHighlight.svg';
import targetCross from '../assets/squareHighlights/targetCross.svg';

export const squareHighlights = {
    red: redSquareHighlight,
    yellow: yellowSquareHighlight,
    blue: blueOvalHighlight,
    grey: greyFilledHighlight,
    unfilled: unfilledHighlight,
    bomb: bombHighlight,
    targetCross: targetCross
} as const;

export function getSquareHighlight(isLight: boolean) {
    return !isLight ? unfilledHighlight : greyFilledHighlight;
}

export function getBombHighlight() {
    return bombHighlight;
}

export function getTargetCross() {
    return targetCross;
}