import redSquareHighlight from '../assets/squareHighlights/redTargetHighlight.svg';
import yellowSquareHighlight from '../assets/squareHighlights/yellowTargetHighlight.svg';
import blueOvalHighlight from '../assets/squareHighlights/blueOvalHighlight.svg';
import greyFilledHighlight from '../assets/squareHighlights/greyFilledHighlight.svg';
import unfilledHighlight from '../assets/squareHighlights/unfilledHighlight.svg';

export const squareHighlights = {
    red: redSquareHighlight,
    yellow: yellowSquareHighlight,
    blue: blueOvalHighlight,
    grey: greyFilledHighlight,
    unfilled: unfilledHighlight
} as const;

export function getSquareHighlight(isLight: boolean) {
    return !isLight ? unfilledHighlight : greyFilledHighlight;
}