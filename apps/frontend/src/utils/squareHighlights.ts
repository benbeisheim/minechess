import greyFilledHighlight from '../assets/squareHighlights/greyFilledHighlight.svg';
import unfilledHighlight from '../assets/squareHighlights/unfilledHighlight.svg';
import targetCross from '../assets/squareHighlights/targetCross.svg';

export function getSquareHighlight(isLight: boolean) {
    return !isLight ? unfilledHighlight : greyFilledHighlight;
}

export function getTargetCross() {
    return targetCross;
}
